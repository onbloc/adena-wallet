import {
  defaultAddressPrefix,
  Tx,
  uint8ArrayToBase64,
  BroadcastTxCommitResult,
  BroadcastTxSyncResult,
  BroadcastTransactionMap,
  Any,
} from '@gnolang/tm2-js-client';
import Long from 'long';
import {
  PubKeyMultisig,
  Multisignature,
  CompactBitArray,
} from '@gnolang/tm2-js-client/bin/proto/tm2/multisig';

import { EncodeTxSignature, WalletService } from '..';
import { GnoProvider } from '@common/provider/gno';

import {
  CreateMultisigTransactionParams,
  MultisigTransactionDocument,
  Message,
  Fee,
  UnsignedTransaction,
  Signature,
  MultisigAccountResult,
} from '@inject/types';

import {
  MultisigConfig,
  fromBase64,
  Account,
  isMultisigAccount,
  fromBase64Multisig,
  Document,
  documentToTx,
  MultisigAccount,
  convertMessageToAmino,
  fromBech32,
  createMultisigPublicKey,
} from 'adena-module';

const AMINO_PREFIX = 0x0a;
const AMINO_LENGTH = 0x21;
const AMINO_PREFIXED_LENGTH = 35;
const MULTISIG_TYPE = '/tm.PubKeyMultisig';
const SECP256K1_TYPE = '/tm.PubKeySecp256k1';
const DEFAULT_GAS_FEE = '1ugnot';

interface SignerInfo {
  address: string;
  publicKey: {
    '@type': string;
    value: string;
  };
  bytes: Uint8Array;
  typeUrl: string;
}

export class MultisigService {
  private walletService: WalletService;
  private gnoProvider: GnoProvider | null;

  constructor(walletService: WalletService, gnoProvider: GnoProvider | null) {
    this.walletService = walletService;
    this.gnoProvider = gnoProvider;
  }

  public getGnoProvider(): GnoProvider {
    if (!this.gnoProvider) {
      throw new Error('Gno provider not initialized.');
    }
    return this.gnoProvider;
  }

  /**
   * Create a multisig account
   * @param config - Multisig configuration (signers and threshold)
   * @returns Multisig account address, addressBytes, and publicKey
   */
  public createMultisigAccount = async (config: MultisigConfig): Promise<MultisigAccountResult> => {
    const { signers, threshold, noSort = true } = config;

    const signerInfos: SignerInfo[] = await this.fetchSignerInfos(signers);
    const sortedSignerInfos = noSort ? signerInfos : this.sortSignerInfos(signerInfos);

    // Create Any objects for each public key
    const pubKeysAny = sortedSignerInfos.map((info) => {
      return Any.create({
        type_url: info.typeUrl,
        value: info.bytes,
      });
    });

    // Create PubKeyMultisig proto object
    const multisigPublicKeyProto = PubKeyMultisig.create({
      k: Long.fromNumber(threshold),
      pub_keys: pubKeysAny,
    });

    // Generate address and public key using Proto to Amino conversion
    const { address: multisigAddress, publicKey: multisigPubKey } = createMultisigPublicKey(
      multisigPublicKeyProto,
      defaultAddressPrefix,
    );

    // Extract address bytes from bech32 address
    const { data: addressBytes } = fromBech32(multisigAddress);

    // Convert Uint8Array to object format (for storage)
    return {
      multisigAddress,
      multisigAddressBytes: this.uint8ArrayToRecord(addressBytes),
      multisigPubKey: this.uint8ArrayToRecord(multisigPubKey),
      signerPublicKeys: sortedSignerInfos.map((info) => ({
        address: info.address,
        publicKey: info.publicKey,
      })),
    };
  };

  /**
   * Create an unsigned multisig transaction
   *
   * @param params - Transaction parameters (SDK format)
   * @returns Transaction document (unsigned tx + metadata)
   */
  public createMultisigTransaction = async (
    params: CreateMultisigTransactionParams,
  ): Promise<MultisigTransactionDocument> => {
    const {
      chain_id,
      msgs,
      fee,
      memo = '',
      accountNumber: inputAccountNumber,
      sequence: inputSequence,
    } = params;

    try {
      if (!msgs || msgs.length === 0) {
        throw new Error('At least one message is required');
      }

      const { accountNumber, sequence } = await this.getAccountInfo(
        msgs[0],
        inputAccountNumber,
        inputSequence,
      );

      const unsignedTx: UnsignedTransaction = {
        msgs: msgs,
        fee: {
          gas_wanted: fee.gas,
          gas_fee: this.convertFeeToString(fee),
        },
        signatures: null,
        memo,
      };

      return {
        tx: unsignedTx,
        accountNumber,
        sequence,
        chainId: chain_id,
      };
    } catch (error) {
      console.error('Failed to create multisig transaction: ', error);
      throw error;
    }
  };

  /**
   * Create a signature
   *
   * @param account
   * @param document
   * @returns
   */
  public createSignature = async (
    account: Account,
    document: Document,
  ): Promise<EncodeTxSignature> => {
    const provider = this.getGnoProvider();
    const address = await account.getAddress(defaultAddressPrefix);
    const accountInfo = await provider.getAccountInfo(address);
    const wallet = await this.walletService.loadWallet();
    const { signature } = await wallet.signByAccountId(provider, account.id, document);
    const signatures = signature.map((s) => ({
      pubKey: {
        typeUrl: accountInfo?.publicKey?.['@type'],
        value: accountInfo?.publicKey?.value ?? undefined,
      },
      signature: uint8ArrayToBase64(s.signature),
    }));
    return signatures[0];
  };

  /**
   * Sign a multisig transaction
   * @param account - Current account (signer)
   * @param multisigDocument - Transaction document to sign
   * @returns New signature
   */
  public signMultisigTransaction = async (
    account: Account,
    multisigDocument: MultisigTransactionDocument,
  ): Promise<Signature> => {
    try {
      const aminoDocument = this.convertMultisigDocumentToAminoDocument(multisigDocument);

      const encodedSignature = await this.createSignature(account, aminoDocument);

      return this.convertToMultisigSignature(encodedSignature);
    } catch (error) {
      console.error('Failed to sign multisig transaction:', error);
      throw error;
    }
  };

  /**
   * Combine multisig signatures and prepare transaction for broadcasting
   * @param multisigAccount - The multisig account
   * @param multisigDocument - MultisigTransactionDocument
   * @param multisigSignatures - Collected signatures
   * @returns Prepared transaction data ready for broadcasting
   */
  async combineMultisigSignatures(
    multisigAccount: MultisigAccount,
    multisigDocument: MultisigTransactionDocument,
    multisigSignatures: Signature[],
  ): Promise<{ tx: Tx; txBytes: Uint8Array; txBase64: string }> {
    // 1. Validate inputs
    this.validateMultisigAccount(multisigAccount);
    this.validateMultisigTransactionDocument(multisigDocument);

    const { multisigConfig } = multisigAccount;

    // 2. Check threshold
    const signatures = multisigSignatures ?? [];
    if (signatures.length === 0) {
      throw new Error('No signatures provided');
    }
    if (signatures.length < multisigConfig.threshold) {
      throw new Error(
        `Insufficient signatures: ${signatures.length}/${multisigConfig.threshold} required`,
      );
    }

    // 3. Signer public keys to bytes
    const signerPublicKeys = multisigAccount.signerPublicKeys.map((signer) =>
      fromBase64(signer.publicKey.value),
    );

    // 4. Build multisignature using Proto types
    const bitArray = this.createProtoBitArray(
      signerPublicKeys.length,
      signatures,
      signerPublicKeys,
    );
    const sigs = this.extractSignaturesInOrder(signatures, signerPublicKeys);

    const protoMultisig = Multisignature.create({
      bit_array: bitArray,
      sigs: sigs,
    });

    const multisigSignature = Multisignature.encode(protoMultisig).finish();

    // 5. Parse gas fee
    const { amount, denom } = this.parseGasFee(multisigDocument.tx.fee.gas_fee);

    // 6. Build Amino document
    const aminoDocument: Document = {
      msgs: multisigDocument.tx.msgs.map(convertMessageToAmino),
      fee: {
        amount: [{ amount, denom }],
        gas: multisigDocument.tx.fee.gas_wanted,
      },
      chain_id: multisigDocument.chainId,
      memo: multisigDocument.tx.memo,
      account_number: multisigDocument.accountNumber,
      sequence: multisigDocument.sequence,
      signatures: [
        {
          pub_key: {
            '@type': MULTISIG_TYPE,
            threshold: multisigConfig.threshold.toString(),
            pubkeys: signerPublicKeys.map((pubKey) => ({
              '@type': SECP256K1_TYPE,
              value: uint8ArrayToBase64(pubKey),
            })),
          },
          signature: uint8ArrayToBase64(multisigSignature),
        },
      ],
    };

    const tx = documentToTx(aminoDocument);
    const txBytes = Tx.encode(tx).finish();
    const txBase64 = uint8ArrayToBase64(txBytes);

    return {
      tx,
      txBytes,
      txBase64,
    };
  }

  /**
   * Broadcast signed multisig transaction (commit mode)
   * Waits for transaction to be included in a block
   */
  async broadcastTxCommit(signedTx: Tx): Promise<BroadcastTxCommitResult> {
    return this.broadcastTransaction(
      signedTx,
      'broadcast_tx_commit',
    ) as Promise<BroadcastTxCommitResult>;
  }

  /**
   * Broadcast signed multisig transaction (sync mode)
   * Returns immediately after transaction is accepted into mempool
   */
  async broadcastTxSync(signedTx: Tx): Promise<BroadcastTxSyncResult> {
    return this.broadcastTransaction(
      signedTx,
      'broadcast_tx_sync',
    ) as Promise<BroadcastTxSyncResult>;
  }

  /**
   * Broadcast signed multisig transaction
   * @param signedTx - Signed transaction
   * @param mode - Broadcast mode ('commit' waits for block, 'sync' returns immediately)
   */
  private async broadcastTransaction(
    signedTx: Tx,
    mode: 'broadcast_tx_commit' | 'broadcast_tx_sync',
  ): Promise<BroadcastTxCommitResult | BroadcastTxSyncResult> {
    try {
      const provider = this.getGnoProvider();
      const txBytes = Tx.encode(signedTx).finish();
      const encodedTx = uint8ArrayToBase64(txBytes);

      return await provider.sendTransaction(encodedTx, mode as keyof BroadcastTransactionMap);
    } catch (error) {
      console.error('Broadcast Failed:', error);
      throw error;
    }
  }

  /**
   * Create Proto CompactBitArray from signatures
   * Matches Go implementation: github.com/gnolang/gno/tm2/pkg/crypto/multisig/bitarray
   */
  private createProtoBitArray(
    numSigners: number,
    signatures: Signature[],
    signerPublicKeys: Uint8Array[],
  ): CompactBitArray {
    const numBits = numSigners;
    const extraBitsStored = numBits % 8;
    const numBytes = Math.ceil(numBits / 8);
    const elems = new Uint8Array(numBytes);

    // Set bits for each signature
    for (let i = 0; i < signatures.length; i++) {
      const signature = signatures[i];

      if (!signature.pub_key.value) {
        throw new Error(`Signature ${i + 1} missing public key value`);
      }

      // Extract public key (handle Amino prefix if present)
      const sigPubKeyRaw = fromBase64(signature.pub_key.value);
      const sigHasAminoPrefix =
        sigPubKeyRaw.length === AMINO_PREFIXED_LENGTH &&
        sigPubKeyRaw[0] === AMINO_PREFIX &&
        sigPubKeyRaw[1] === AMINO_LENGTH;
      const sigPubKey = sigHasAminoPrefix ? sigPubKeyRaw.slice(2) : sigPubKeyRaw;

      // Find index in signerPublicKeys
      const index = this.findPublicKeyIndex(sigPubKey, signerPublicKeys);
      if (index === -1) {
        throw new Error(
          `Public key not found in multisig signers: ${uint8ArrayToBase64(sigPubKey)}`,
        );
      }

      // Set bit at index (MSB first, matching Go implementation)
      // Go: bA.Elems[i>>3] |= (uint8(1) << uint8(7-(i%8)))
      const byteIndex = Math.floor(index / 8);
      const bitIndex = index % 8;
      elems[byteIndex] |= 1 << (7 - bitIndex);
    }

    return CompactBitArray.create({
      extra_bits_stored: extraBitsStored,
      elems: elems,
    });
  }

  /**
   * Extract signatures in the correct order matching the bit array
   */
  private extractSignaturesInOrder(
    signatures: Signature[],
    signerPublicKeys: Uint8Array[],
  ): Uint8Array[] {
    // Create a map of public key -> signature
    const sigMap = new Map<string, Uint8Array>();

    for (const signature of signatures) {
      if (!signature.pub_key.value) {
        throw new Error('Signature missing public key value');
      }

      const sigPubKeyRaw = fromBase64(signature.pub_key.value);
      const sigHasAminoPrefix =
        sigPubKeyRaw.length === AMINO_PREFIXED_LENGTH &&
        sigPubKeyRaw[0] === AMINO_PREFIX &&
        sigPubKeyRaw[1] === AMINO_LENGTH;
      const sigPubKey = sigHasAminoPrefix ? sigPubKeyRaw.slice(2) : sigPubKeyRaw;

      const pubKeyBase64 = uint8ArrayToBase64(sigPubKey);
      const sig = fromBase64(signature.signature);

      sigMap.set(pubKeyBase64, sig);
    }

    // Extract signatures in order
    const orderedSigs: Uint8Array[] = [];

    for (const pubKey of signerPublicKeys) {
      const pubKeyBase64 = uint8ArrayToBase64(pubKey);
      const sig = sigMap.get(pubKeyBase64);

      if (sig) {
        orderedSigs.push(sig);
      }
    }

    return orderedSigs;
  }

  /**
   * Find the index of a public key in the signers list
   * Handles both raw and Amino-prefixed public keys
   */
  private findPublicKeyIndex(pubkey: Uint8Array, keys: Uint8Array[]): number {
    for (let i = 0; i < keys.length; i++) {
      if (this.arePublicKeysEqual(pubkey, keys[i])) {
        return i;
      }

      // Handle Amino prefix differences
      if (keys[i].length === AMINO_PREFIXED_LENGTH && pubkey.length === 33) {
        const keyWithoutPrefix = keys[i].slice(2);
        if (this.arePublicKeysEqual(pubkey, keyWithoutPrefix)) {
          return i;
        }
      }

      if (pubkey.length === AMINO_PREFIXED_LENGTH && keys[i].length === 33) {
        const pubkeyWithoutPrefix = pubkey.slice(2);
        if (this.arePublicKeysEqual(pubkeyWithoutPrefix, keys[i])) {
          return i;
        }
      }
    }

    return -1;
  }

  /**
   * Compare two Uint8Arrays for equality
   */
  private arePublicKeysEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  private async getPublicKeyFromChain(address: string): Promise<
    | {
        '@type': string;
        value: string;
      }
    | null
    | undefined
  > {
    const provider = this.getGnoProvider();
    const accountInfo = await provider.getAccountInfo(address).catch(() => null);
    const accountPubKey = accountInfo?.publicKey;

    return accountPubKey;
  }

  /**
   * Get account number and sequence from chain or use provided values
   */
  private async getAccountInfo(
    firstMsg: Message,
    inputAccountNumber?: string,
    inputSequence?: string,
  ): Promise<{ accountNumber: string; sequence: string }> {
    const caller = this.extractCallerFromMessage(firstMsg);
    if (!caller) {
      throw new Error('Caller address not found in message');
    }

    const provider = this.getGnoProvider();
    const accountInfo = await provider.getAccountInfo(caller);

    if (!accountInfo) {
      throw new Error(`Account not found: ${caller}`);
    }

    return {
      accountNumber: inputAccountNumber || accountInfo.accountNumber.toString(),
      sequence: inputSequence || accountInfo.sequence.toString(),
    };
  }

  /**
   * Fetch public key information for all signers
   */
  private async fetchSignerInfos(signers: string[]): Promise<SignerInfo[]> {
    const signerInfos: SignerInfo[] = [];

    for (const address of signers) {
      const publicKeyInfo = await this.getPublicKeyFromChain(address);

      if (!publicKeyInfo?.value) {
        throw new Error(
          `Public key not found for address: ${address}. ` +
            'The account may not have sent any transactions yet.',
        );
      }

      const publicKeyBytes = fromBase64Multisig(publicKeyInfo.value);

      signerInfos.push({
        address,
        publicKey: publicKeyInfo,
        bytes: publicKeyBytes,
        typeUrl: publicKeyInfo['@type'],
      });
    }

    return signerInfos;
  }

  /**
   * Sort signer infos by public key bytes
   */
  private sortSignerInfos(signerInfos: SignerInfo[]): SignerInfo[] {
    return [...signerInfos].sort((a, b) => {
      for (let i = 0; i < Math.min(a.bytes.length, b.bytes.length); i++) {
        if (a.bytes[i] !== b.bytes[i]) {
          return a.bytes[i] - b.bytes[i];
        }
      }
      return a.bytes.length - b.bytes.length;
    });
  }

  /**
   * Convert Uint8Array to Record<string, number> for storage
   */
  private uint8ArrayToRecord(array: Uint8Array): Record<string, number> {
    const record: Record<string, number> = {};
    for (let i = 0; i < array.length; i++) {
      record[i.toString()] = array[i];
    }
    return record;
  }

  /**
   * Extract caller address from message
   */
  private extractCallerFromMessage = (msg: Message): string | null => {
    const { type, value } = msg;

    switch (type) {
      case '/vm.m_call':
      case '/vm.m_addpkg':
        return value.caller || value.creator;

      case '/bank.MsgSend':
        return value.from_address;

      default:
        return value.caller || value.creator || value.from_address || null;
    }
  };

  /**
   * Convert SDK message format to gnokey format
   */
  private convertMessageToGnokeyFormat = (msg: Message): any => {
    const { type, value } = msg;

    switch (type) {
      case '/vm.m_call':
        return {
          '@type': '/vm.m_call',
          caller: value.caller,
          send: value.send || '',
          max_deposit: '',
          pkg_path: value.pkg_path,
          func: value.func,
          args: value.args || [],
        };

      case '/bank.MsgSend':
        return {
          '@type': '/bank.MsgSend',
          from_address: value.from_address,
          to_address: value.to_address,
          amount: value.amount,
        };

      case '/vm.m_addpkg':
        return {
          '@type': '/vm.m_addpkg',
          creator: value.creator,
          package: value.package,
          deposit: value.deposit || '',
        };

      default:
        return {
          '@type': type,
          ...value,
        };
    }
  };

  /**
   * Convert fee object to string format (e.g., "6113ugnot")
   */
  private convertFeeToString = (fee: Fee): string => {
    if (!fee.amount || fee.amount.length === 0) {
      return DEFAULT_GAS_FEE;
    }

    const coin = fee.amount[0];
    return `${coin.amount}${coin.denom}`;
  };

  /**
   * Convert encoded signature to Multisig Signature format
   */
  private convertToMultisigSignature(encodedSignature: EncodeTxSignature): Signature {
    return {
      pub_key: {
        type: '/tm.PubKeySecp256k1',
        value: encodedSignature.pubKey.value || '',
      },
      signature: encodedSignature.signature,
    };
  }

  private convertMultisigDocumentToAminoDocument(
    multisigDocument: MultisigTransactionDocument,
  ): Document {
    const aminoMessages = multisigDocument.tx.msgs.map(convertMessageToAmino);
    const { amount, denom } = this.parseGasFee(multisigDocument.tx.fee.gas_fee);

    return {
      msgs: aminoMessages,
      fee: {
        amount: [{ amount, denom }],
        gas: multisigDocument.tx.fee.gas_wanted,
      },
      chain_id: multisigDocument.chainId,
      memo: multisigDocument.tx.memo,
      account_number: multisigDocument.accountNumber,
      sequence: multisigDocument.sequence,
    };
  }

  /**
   * Validate multisig account
   */
  private validateMultisigAccount(account: Account): void {
    if (!account) {
      throw new Error('Account is required');
    }

    if (!isMultisigAccount(account)) {
      throw new Error('Account must be a multisig account');
    }

    if (!account.publicKey) {
      throw new Error('Multisig account must have a public key');
    }
  }

  /**
   * Validate MultisigTransactionDocument
   */
  private validateMultisigTransactionDocument(document: MultisigTransactionDocument): void {
    if (!document) {
      throw new Error('Document is required');
    }

    if (!document.tx) {
      throw new Error('Transaction is required');
    }

    if (!document.tx.msgs || document.tx.msgs.length === 0) {
      throw new Error('At least one message is required');
    }
  }

  private parseGasFee(gasFeeString: string): { amount: string; denom: string } {
    const match = gasFeeString.match(/^(\d+)(\w+)$/);
    if (!match) {
      throw new Error(`Invalid gas fee format: ${gasFeeString}`);
    }
    return { amount: match[1], denom: match[2] };
  }
}
