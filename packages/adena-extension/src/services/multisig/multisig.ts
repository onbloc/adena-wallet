import {
  BroadcastTransactionMap,
  BroadcastTxCommitResult,
  BroadcastTxSyncResult,
  defaultAddressPrefix,
  Tx,
  uint8ArrayToBase64,
} from '@gnolang/tm2-js-client';
import {
  CompactBitArray,
  compactBitArraySetIndex,
  createCompactBitArray,
  Multisignature,
} from '@gnolang/tm2-js-client/bin/proto/tm2/multisig';

import { GnoProvider } from '@common/provider/gno';
import { EncodeTxSignature, WalletService } from '..';

import { ContractMessage, Fee, Message, MultisigAccountResult, Signature } from '@inject/types';

import { MemPackage, MsgAddPackage, MsgCall, MsgRun, MsgSend } from '@gnolang/gno-js-client';
import {
  Account,
  combineMultisigPublicKey,
  createMultisigPublicKey,
  Document,
  fromBase64,
  fromBech32,
  isMultisigAccount,
  MultisigAccount,
  MultisigConfig,
  RawMemPackage,
  RawPubKey,
  RawTx,
  RawTxMessageType,
  rawTxToTx,
  toBase64,
} from 'adena-module';

const AMINO_PREFIX = 0x0a;
const AMINO_LENGTH = 0x21;
const AMINO_PREFIXED_LENGTH = 35;
const SECP256K1_TYPE = '/tm.PubKeySecp256k1';
const DEFAULT_GAS_FEE = '1ugnot';

interface SignerInfo {
  address: string;
  publicKey: {
    '@type': string;
    value: string;
  };
  bytes: Uint8Array;
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

    // Generate address and public key using Proto to Amino conversion
    const { address: multisigAddress, publicKey: multisigPubKey } = createMultisigPublicKey(
      threshold,
      sortedSignerInfos.map((info) => ({
        '@type': info.publicKey['@type'],
        value: info.bytes,
      })),
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
        publicKey: {
          '@type': info.publicKey['@type'],
          value: info.publicKey.value,
        },
      })),
    };
  };

  /**
   * Create an unsigned multisig transaction
   *
   * @param params - Transaction parameters (SDK format)
   * @returns Transaction document (unsigned tx + metadata)
   */
  public createRawTransaction = async (
    messages: ContractMessage[],
    memo: string,
    gasWanted: string,
    gasFee: string,
  ): Promise<RawTx> => {
    if (!messages || messages.length === 0) {
      throw new Error('At least one message is required');
    }

    return mapRawTransactionByParams(messages, memo, gasWanted, gasFee);
  };

  /**
   * Save multisig transaction document to file
   * @param tx - Transaction document to save
   * @param fileName - File name (default: 'multisig-transaction.tx')
   * @returns true if saved successfully, false if user cancelled
   */
  public saveTransactionToFile = async (
    tx: RawTx,
    fileName = 'multisig-transaction.tx',
  ): Promise<boolean> => {
    try {
      const jsonString = JSON.stringify(tx, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });

      if ('showSaveFilePicker' in window) {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: 'Multisig Transaction File',
              accept: {
                'application/json': ['.tx'],
              },
            },
          ],
        });

        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();

        return true;
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return true;
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('User cancelled file save');
        return false;
      }
      console.error('Failed to save transaction file:', error);
      throw error;
    }
  };

  /**
   * Save signature to file
   * @param signature - Signature to save
   * @param fileName - File name (default: 'multisig-signature.sig')
   * @returns true if saved successfully, false if user cancelled
   */
  public saveSignatureToFile = async (
    signature: Signature,
    fileName = 'multisig-signature.sig',
  ): Promise<boolean> => {
    try {
      const jsonString = JSON.stringify(signature, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });

      if ('showSaveFilePicker' in window) {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: 'Multisig Signature File',
              accept: {
                'application/json': ['.sig'],
              },
            },
          ],
        });

        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();

        return true;
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return true;
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('User cancelled file save');
        return false;
      }
      console.error('Failed to save signature file:', error);
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
    address: string,
    chainId: string,
    transaction: RawTx,
    accountNumber: string,
    sequence: string,
  ): Promise<Signature> => {
    try {
      await this.validatePublicKeyExists(address);

      const aminoDocument = this.convertMultisigDocumentToAminoDocument(
        transaction,
        accountNumber,
        sequence,
        chainId,
      );
      const encodedSignature = await this.createSignature(account, aminoDocument);
      return {
        pub_key: {
          '@type': '/tm.PubKeySecp256k1',
          value: encodedSignature.pubKey.value || '',
        },
        signature: encodedSignature.signature,
      };
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
    transaction: RawTx,
    multisigSignatures: Signature[],
  ): Promise<{ tx: Tx; txBytes: Uint8Array; txBase64: string }> {
    // Validate inputs
    this.validateMultisigAccount(multisigAccount);
    this.validateMultisigTransactionDocument(transaction);

    const { multisigConfig } = multisigAccount;

    // Check threshold
    const signatures = multisigSignatures ?? [];
    if (signatures.length === 0) {
      throw new Error('No signatures provided');
    }
    if (signatures.length < multisigConfig.threshold) {
      throw new Error(
        `Insufficient signatures: ${signatures.length}/${multisigConfig.threshold} required`,
      );
    }

    // Signer public keys to bytes
    const signerPublicKeys = multisigAccount.signerPublicKeys.map((signer) =>
      fromBase64(signer.publicKey.value),
    );

    // Build multisignature using Proto types
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

    const pubKeys = signerPublicKeys.map((pubKey) => ({
      '@type': SECP256K1_TYPE,
      value: uint8ArrayToBase64(pubKey),
    }));
    const multisigPublicKey: RawPubKey = combineMultisigPublicKey(
      pubKeys,
      multisigConfig.threshold,
    );

    const signedRawTx: RawTx = {
      ...transaction,
      signatures: [
        {
          pub_key: multisigPublicKey,
          signature: uint8ArrayToBase64(multisigSignature),
        },
      ],
    };

    const tx = rawTxToTx(signedRawTx);
    if (!tx) {
      throw new Error('Failed to convert raw transaction to transaction');
    }

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
    return this.broadcastTransaction(signedTx, 'broadcast_tx_commit') as Promise<
      BroadcastTxCommitResult
    >;
  }

  /**
   * Broadcast signed multisig transaction (sync mode)
   * Returns immediately after transaction is accepted into mempool
   */
  async broadcastTxSync(signedTx: Tx): Promise<BroadcastTxSyncResult> {
    return this.broadcastTransaction(signedTx, 'broadcast_tx_sync') as Promise<
      BroadcastTxSyncResult
    >;
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
   */
  private createProtoBitArray(
    numSigners: number,
    signatures: Signature[],
    signerPublicKeys: Uint8Array[],
  ): CompactBitArray {
    // Create CompactBitArray using utility function from tm2-js-client
    const bitArray = createCompactBitArray(numSigners);

    // Set bits for each signature
    for (let i = 0; i < signatures.length; i++) {
      const signature = signatures[i];

      if (!signature.pub_key.value) {
        throw new Error(`Signature ${i + 1} missing public key value`);
      }

      // Extract public key (handle Amino prefix if present)
      const sigPubKey = this.stripAminoPrefix(fromBase64(signature.pub_key.value));

      // Find index in signerPublicKeys
      const index = this.findPublicKeyIndex(sigPubKey, signerPublicKeys);
      if (index === -1) {
        throw new Error(
          `Public key not found in multisig signers: ${uint8ArrayToBase64(sigPubKey)}`,
        );
      }

      // Set bit at index using compactBitArraySetIndex (MSB first, matching Go implementation)
      compactBitArraySetIndex(bitArray, index, true);
    }

    return bitArray;
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

      const sigPubKey = this.stripAminoPrefix(fromBase64(signature.pub_key.value));
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
    const normalizedPubkey = this.stripAminoPrefix(pubkey);

    for (let i = 0; i < keys.length; i++) {
      const normalizedKey = this.stripAminoPrefix(keys[i]);
      if (this.isEqualsPublicKeys(normalizedPubkey, normalizedKey)) {
        return i;
      }
    }

    return -1;
  }

  /**
   * Compare two Uint8Arrays for equality
   */
  private isEqualsPublicKeys(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  /**
   * Strip Amino prefix from public key if present
   */
  private stripAminoPrefix(pubKeyBytes: Uint8Array): Uint8Array {
    const hasAminoPrefix =
      pubKeyBytes.length === AMINO_PREFIXED_LENGTH &&
      pubKeyBytes[0] === AMINO_PREFIX &&
      pubKeyBytes[1] === AMINO_LENGTH;
    return hasAminoPrefix ? pubKeyBytes.slice(2) : pubKeyBytes;
  }

  private async getPublicKeyFromChain(
    address: string,
  ): Promise<
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
   * Validate that public key exists for the given address
   * @param address - Account address to validate
   * @throws Error if public key not found
   */
  public async validatePublicKeyExists(address: string): Promise<void> {
    const publicKeyInfo = await this.getPublicKeyFromChain(address);

    if (!publicKeyInfo?.value) {
      throw new Error('Public key not found. This account has not sent any transactions yet.');
    }
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
    const results = await Promise.allSettled(
      signers.map((address) => this.getPublicKeyFromChain(address)),
    );

    const uninitializedAccounts: string[] = [];
    const signerInfos: SignerInfo[] = [];

    results.forEach((result, index) => {
      const address = signers[index];

      const publicKeyInfo = result.status === 'fulfilled' ? result.value : null;

      if (!publicKeyInfo?.value) {
        uninitializedAccounts.push(address);
      } else {
        signerInfos.push({
          address,
          publicKey: publicKeyInfo,
          bytes: fromBase64(publicKeyInfo.value),
        });
      }
    });

    if (uninitializedAccounts.length > 0) {
      const accountList =
        uninitializedAccounts.length > 1
          ? `${uninitializedAccounts.join(', ')}`
          : uninitializedAccounts[0];

      throw new Error(
        `Initialize ${accountList} by sending any transaction once before using it as a signer.`,
      );
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
   * Convert fee object to string format (e.g., "6113ugnot")
   */
  private convertFeeToString = (fee: Fee): string => {
    if (!fee.amount || fee.amount.length === 0) {
      return DEFAULT_GAS_FEE;
    }

    const coin = fee.amount[0];
    return `${coin.amount}${coin.denom}`;
  };

  private convertMultisigDocumentToAminoDocument(
    rawTx: RawTx,
    accountNumber: string,
    sequence: string,
    chainId: string,
  ): Document {
    const { amount, denom } = this.parseGasFee(rawTx.fee.gas_fee);

    return {
      msgs: rawTx.msg.map((rawMessage) => ({
        type: rawMessage['@type'],
        value: rawMessage,
      })),
      fee: {
        amount: [{ amount, denom }],
        gas: rawTx.fee.gas_wanted,
      },
      chain_id: chainId,
      memo: rawTx.memo,
      account_number: accountNumber,
      sequence: sequence,
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
  private validateMultisigTransactionDocument(rawTx: RawTx): void {
    if (!rawTx.msg || rawTx.msg.length === 0) {
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

function mapRawTransactionByParams(
  messages: ContractMessage[],
  memo: string,
  gasWanted: string,
  gasFee: string,
): RawTx {
  return {
    msg: messages.map((message) => mapRawTransactionMessage(message)),
    fee: {
      gas_wanted: gasWanted,
      gas_fee: gasFee,
    },
    signatures: [],
    memo: memo || '',
  };
}

function mapRawTransactionMessage(message: ContractMessage): RawTxMessageType {
  switch (message.type) {
    case '/vm.m_call': {
      const callMessage = message.value as MsgCall;
      return {
        '@type': message.type,
        func: callMessage.func,
        pkg_path: callMessage.pkg_path,
        args: callMessage.args,
        max_deposit: callMessage.max_deposit,
        caller: callMessage.caller,
        send: callMessage.send,
      };
    }
    case '/vm.m_addpkg': {
      const addpkgMessage = message.value as MsgAddPackage;
      if (!addpkgMessage.package) {
        throw new Error('Package is required');
      }

      return {
        '@type': message.type,
        creator: addpkgMessage.creator,
        send: addpkgMessage.send,
        max_deposit: addpkgMessage.max_deposit,
        package: mapRawMemPackage(addpkgMessage.package),
      };
    }
    case '/vm.m_run': {
      const runMessage = message.value as MsgRun;
      if (!runMessage.package) {
        throw new Error('Package is required');
      }

      return {
        '@type': message.type,
        caller: runMessage.caller,
        send: runMessage.send,
        max_deposit: runMessage.max_deposit,
        package: mapRawMemPackage(runMessage.package),
      };
    }
    case '/bank.MsgSend': {
      const sendMessage = message.value as MsgSend;
      return {
        '@type': message.type,
        from_address: sendMessage.from_address,
        to_address: sendMessage.to_address,
        amount: sendMessage.amount,
      };
    }
  }

  throw new Error(`Unsupported message type: ${message.type}`);
}

function mapRawMemPackage(memPackage: MemPackage): RawMemPackage {
  return {
    name: memPackage.name,
    path: memPackage.path,
    info: memPackage.info
      ? {
          type_url: memPackage.info.type_url || '',
          value: toBase64(memPackage.info.value) || '',
        }
      : undefined,
    files: memPackage.files.map((file) => ({
      name: file.name,
      body: file.body,
    })),
  };
}
