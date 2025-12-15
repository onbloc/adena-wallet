import {
  defaultAddressPrefix,
  Tx,
  TxFee,
  TxSignature,
  Any,
  uint8ArrayToBase64,
  BroadcastTxCommitResult,
  BroadcastTxSyncResult,
  BroadcastTransactionMap,
} from '@gnolang/tm2-js-client';
import {
  MsgEndpoint,
  MsgSend,
  MsgCall,
  MsgAddPackage,
  MsgRun,
  MemFile,
  MemPackage,
} from '@gnolang/gno-js-client';

import { EncodeTxSignature, WalletService } from '..';
import { GnoProvider } from '@common/provider/gno';

import {
  CreateMultisigTransactionParams,
  MultisigTransactionDocument,
  StandardDocument,
  Message,
  Fee,
  UnsignedTransaction,
  Signature,
} from '@inject/types';

import {
  MultisigConfig,
  createMultisigPublicKey,
  fromBase64,
  Account,
  isMultisigAccount,
  fromBase64Multisig,
  fromBech32Multisig,
  PublicKeyInfo,
  Document,
  documentToTx,
} from 'adena-module';

import { Multisignature } from './multisignature';

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
  public createMultisigAccount = async (config: MultisigConfig) => {
    const { signers, threshold, noSort = true } = config;

    const signerInfos: SignerInfo[] = [];

    for (const address of signers) {
      const publicKeyInfo = await this.getPublicKeyFromChain(address);

      if (!publicKeyInfo?.value) {
        throw new Error(
          `Public key not found for address: ${address}. ` +
            `The account may not have sent any transactions yet.`,
        );
      }

      const publicKeyBytes = fromBase64Multisig(publicKeyInfo.value);

      signerInfos.push({
        address: address,
        publicKey: publicKeyInfo,
        bytes: publicKeyBytes,
        typeUrl: publicKeyInfo['@type'],
      });
    }

    let sortedSignerInfos = signerInfos;
    if (!noSort) {
      sortedSignerInfos = [...signerInfos].sort((a, b) => {
        for (let i = 0; i < Math.min(a.bytes.length, b.bytes.length); i++) {
          if (a.bytes[i] !== b.bytes[i]) {
            return a.bytes[i] - b.bytes[i];
          }
        }
        return a.bytes.length - b.bytes.length;
      });
    }

    const sortedPublicKeyInfos: PublicKeyInfo[] = sortedSignerInfos.map((info) => ({
      bytes: info.bytes,
      typeUrl: info.typeUrl,
    }));

    // Create multisig public key (Amino encoded)
    const { address: multisigAddress, publicKey: multisigPubKey } = createMultisigPublicKey(
      sortedPublicKeyInfos,
      threshold,
      defaultAddressPrefix,
    );

    // Extract address bytes from bech32 address
    const { data: addressBytes } = fromBech32Multisig(multisigAddress);

    // Convert Uint8Array to object format (for storage)
    const publicKeyObj: Record<string, number> = {};
    for (let i = 0; i < multisigPubKey.length; i++) {
      publicKeyObj[i.toString()] = multisigPubKey[i];
    }

    const addressBytesObj: Record<string, number> = {};
    for (let i = 0; i < addressBytes.length; i++) {
      addressBytesObj[i.toString()] = addressBytes[i];
    }

    return {
      multisigAddress: multisigAddress,
      multisigAddressBytes: addressBytesObj,
      multisigPubKey: publicKeyObj,
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

      const caller = this.extractCallerFromMessage(msgs[0]);
      if (!caller) {
        throw new Error('Caller address not found in message');
      }

      const provider = this.getGnoProvider();
      const accountInfo = await provider.getAccountInfo(caller);

      if (!accountInfo) {
        throw new Error(`Account not found: ${caller}`);
      }

      const accountNumber = inputAccountNumber || accountInfo.accountNumber.toString();
      const sequence = inputSequence || accountInfo.sequence.toString();

      const convertedMsgs = msgs.map((msg) => this.convertMessageToGnokeyFormat(msg));

      const gasFee = this.convertFeeToString(fee);

      const unsignedTx: UnsignedTransaction = {
        msg: convertedMsgs,
        fee: {
          gas_wanted: fee.gas,
          gas_fee: gasFee,
        },
        signatures: null,
        memo,
      };

      const txDocument: MultisigTransactionDocument = {
        tx: unsignedTx,
        accountNumber,
        sequence,
        chainId: chain_id,
      };

      return txDocument;
    } catch (error) {
      console.error('Failed to create multisig transaction: ', error);
      throw error;
    }
  };

  /** Create a signature
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
   * Prepare multisig transaction without broadcasting
   * @param multisigAccount - The multisig account
   * @param document - MultisigTransactionDocument with collected signatures
   * @returns Prepared transaction data ready for broadcasting
   */
  async prepareMultisigTransaction(
    multisigAccount: Account,
    document: MultisigTransactionDocument,
  ): Promise<{ tx: Tx; txBytes: Uint8Array; txBase64: string }> {
    // 1. Validate inputs
    console.log('\n1️⃣ Validating Inputs...');
    this.validateMultisigAccount(multisigAccount);
    this.validateMultisigTransactionDocument(document);
    console.log('  ✅ Validation passed');

    // 2. Check threshold
    const threshold = document.multisigConfig?.threshold || 1;
    const signatureCount = document.multisigSignatures?.length || 0;

    console.log(`\n2️⃣ Threshold Check:`);
    console.log(`  Required: ${threshold}`);
    console.log(`  Collected: ${signatureCount}`);

    if (signatureCount < threshold) {
      throw new Error(`Insufficient signatures: ${signatureCount}/${threshold} required`);
    }
    console.log('  ✅ Threshold satisfied');

    // 3. Get signer public keys from chain
    console.log(`\n3️⃣ Getting Signer Public Keys from Chain:`);
    const signerPublicKeys: Uint8Array[] = [];

    for (let i = 0; i < document.multisigConfig!.signers.length; i++) {
      const address = document.multisigConfig!.signers[i];
      console.log(`  [${i + 1}/${document.multisigConfig!.signers.length}] ${address}`);

      const publicKeyInfo = await this.getPublicKeyFromChain(address);
      if (!publicKeyInfo?.value) {
        throw new Error(
          `Public key not found for address: ${address}. ` +
            `The account may not have sent any transactions yet.`,
        );
      }

      console.log(publicKeyInfo.value, 'publicKeyInfo');
      const publicKeyBytes = fromBase64(publicKeyInfo.value);

      // Remove Amino prefix if present (0x0a 0x21 + 33 bytes = 35 bytes)
      const hasAminoPrefix =
        publicKeyBytes.length === 35 && publicKeyBytes[0] === 0x0a && publicKeyBytes[1] === 0x21;

      const cleanPubKey = hasAminoPrefix ? publicKeyBytes.slice(2) : publicKeyBytes;

      signerPublicKeys.push(cleanPubKey);

      console.log(`      Length: ${cleanPubKey.length} bytes`);
      console.log(`      Hex: ${Buffer.from(cleanPubKey).toString('hex').substring(0, 40)}...`);
    }
    console.log('  ✅ All signer public keys retrieved');
    console.log(signerPublicKeys, 'signerPublicKeyssignerPublicKeys');

    // 4. Create Multisignature and add collected signatures
    console.log(`\n4️⃣ Combining Individual Signatures:`);
    const multisig = new Multisignature(signerPublicKeys.length);

    for (let i = 0; i < document.multisigSignatures!.length; i++) {
      const signature = document.multisigSignatures![i];

      if (!signature.pub_key.value) {
        throw new Error(`Signature ${i + 1} missing public key value`);
      }

      console.log(`  [${i + 1}/${document.multisigSignatures!.length}] Adding signature...`);

      // Decode signature public key
      const sigPubKeyRaw = fromBase64(signature.pub_key.value);
      const sigHasAminoPrefix =
        sigPubKeyRaw.length === 35 && sigPubKeyRaw[0] === 0x0a && sigPubKeyRaw[1] === 0x21;
      const sigPubKey = sigHasAminoPrefix ? sigPubKeyRaw.slice(2) : sigPubKeyRaw;

      // Decode signature
      const sig = fromBase64(signature.signature);

      // Add signature to multisig
      multisig.addSignatureFromPubKey(sig, sigPubKey, signerPublicKeys);

      console.log(`      PubKey: ${Buffer.from(sigPubKey).toString('hex').substring(0, 40)}...`);
      console.log(`      Signature: ${signature.signature.substring(0, 40)}...`);
    }
    console.log('  ✅ All signatures combined');

    // 5. Check BitArray
    console.log(`\n5️⃣ BitArray Status:`);
    const bitArrayAmino = multisig.bitArray.toAmino();
    console.log(`  Extra bits: ${bitArrayAmino.extra_bits}`);
    console.log(`  Bits hex: ${Buffer.from(bitArrayAmino.bits).toString('hex')}`);
    console.log(`  Signatures count: ${multisig.sigs.length}`);

    // 6. Encode multisig public key (Protobuf format)
    console.log(`\n6️⃣ Encoding Multisig Public Key:`);
    const multisigPubKeyProtobuf = this.encodeMultisigPublicKey(threshold, signerPublicKeys);
    console.log(`  Protobuf length: ${multisigPubKeyProtobuf.length} bytes`);
    console.log(`  Protobuf hex: ${Buffer.from(multisigPubKeyProtobuf).toString('hex')}`);

    // 7. Add Amino prefix (0x0a + varint length)
    console.log(`\n7️⃣ Adding Amino Prefix:`);
    const multisigPubKeyWithAmino = new Uint8Array([
      0x0a, // Amino field tag
      ...this.encodeVarint(multisigPubKeyProtobuf.length),
      ...multisigPubKeyProtobuf,
    ]);
    console.log(`  With Amino length: ${multisigPubKeyWithAmino.length} bytes`);
    console.log(`  With Amino hex: ${Buffer.from(multisigPubKeyWithAmino).toString('hex')}`);

    // 8. Marshal multisig signature (Protobuf format)
    console.log(`\n8️⃣ Marshaling Combined Multisignature:`);
    const multisigSignature = multisig.marshal();
    console.log(`  Signature length: ${multisigSignature.length} bytes`);
    console.log(`  Signature hex: ${Buffer.from(multisigSignature).toString('hex')}`);

    // 9. Create Tx Messages
    console.log(`\n9️⃣ Creating Transaction Messages:`);
    const messages: Any[] = [];
    for (let i = 0; i < document.tx.msg.length; i++) {
      const msg = document.tx.msg[i];
      const msgType = msg['@type'];
      const msgValue = this.encodeMessage(msg);

      messages.push(
        Any.create({
          type_url: msgType,
          value: msgValue,
        }),
      );

      console.log(`  [${i + 1}/${document.tx.msg.length}] ${msgType}`);
    }
    console.log(`  ✅ ${messages.length} message(s) created`);

    // 10. Parse gas fee
    console.log(`\n🔟 Parsing Gas Fee:`);
    const gasFeeMatch = document.tx.fee.gas_fee.match(/^(\d+)(\w+)$/);
    if (!gasFeeMatch) {
      throw new Error(`Invalid gas fee format: ${document.tx.fee.gas_fee}`);
    }

    const gasWanted = parseInt(document.tx.fee.gas_wanted, 10);
    const gasFee = `${gasFeeMatch[1]}${gasFeeMatch[2]}`;

    console.log(`  Gas wanted: ${gasWanted}`);
    console.log(`  Gas fee: ${gasFee}`);

    // 11. Create Tx
    console.log(`\n1️⃣1️⃣ Creating Transaction:`);
    const tx: Tx = Tx.create({
      messages: messages,
      fee: TxFee.create({
        gas_wanted: gasWanted,
        gas_fee: gasFee,
      }),
      signatures: [
        TxSignature.create({
          pub_key: Any.create({
            type_url: '/tm.PubKeyMultisigThreshold',
            value: multisigPubKeyWithAmino,
          }),
          signature: multisigSignature,
        }),
      ],
      memo: document.tx.memo || '',
    });

    const humanReadableTx = {
      msg: document.tx.msg,
      fee: {
        gas_wanted: document.tx.fee.gas_wanted,
        gas_fee: document.tx.fee.gas_fee,
      },
      signatures: [
        {
          pub_key: {
            '@type': '/tm.PubKeyMultisig',
            threshold: threshold.toString(),
            pubkeys: signerPublicKeys.map((pubKey) => ({
              '@type': '/tm.PubKeySecp256k1',
              value: uint8ArrayToBase64(pubKey),
            })),
          },
          signature: uint8ArrayToBase64(multisigSignature),
        },
      ],
      memo: document.tx.memo || '',
      // account_number와 sequence는 실제로는 트랜잭션에 포함되지 않지만 참고용으로 추가
      // account_number: "5092", // 실제 값이 있다면 추가
      // sequence: "0"          // 실제 값이 있다면 추가
    };

    function convertMessageToAmino(msg: any): { type: string; value: any } {
      if (msg.type && msg.value) {
        return msg;
      }
      const { '@type': type, ...value } = msg;
      return { type, value };
    }

    const aminoMessages = document.tx.msg.map(convertMessageToAmino);

    const aminoSignatures = [
      {
        pub_key: {
          '@type': '/tm.PubKeyMultisig',
          threshold: threshold.toString(),
          pubkeys: signerPublicKeys.map((pubKey) => ({
            '@type': '/tm.PubKeySecp256k1',
            value: uint8ArrayToBase64(pubKey),
          })),
        },
        signature: uint8ArrayToBase64(multisigSignature),
      },
    ];

    const aminoDocument: Document = {
      msgs: aminoMessages,
      fee: {
        amount: [
          {
            amount: gasFeeMatch[1],
            denom: gasFeeMatch[2],
          },
        ],
        gas: document.tx.fee.gas_wanted,
      },
      chain_id: document.chainId,
      memo: document.tx.memo,
      account_number: document.accountNumber,
      sequence: document.sequence,
      signatures: aminoSignatures,
    };
    const aminoDocumentToTx = documentToTx(aminoDocument);

    console.log(aminoDocumentToTx, 'aminoDocumentToTxaminoDocumentToTx');
    console.log(aminoDocument, aminoDocumentToTx, 'aminoDocumentToTx');
    console.log(JSON.stringify(aminoDocument, null, 2), 'aminoDocument');
    console.log(documentToTx(aminoDocument), 'documentToTx');
    console.log(JSON.stringify(humanReadableTx, null, 2));

    console.log(`  Messages: ${tx.messages.length}`);
    console.log(`  Signatures: ${tx.signatures.length}`);
    console.log(`  Memo: "${tx.memo}"`);
    console.log('  ✅ Transaction created');

    // 12. Encode Transaction (Protobuf → bytes)
    console.log(`\n1️⃣2️⃣ Encoding Transaction to Protobuf:`);
    const txBytes = Tx.encode(tx).finish();
    console.log(`  Tx bytes length: ${txBytes.length}`);
    console.log(
      `  Tx bytes hex (first 200): ${Buffer.from(txBytes).toString('hex').substring(0, 200)}...`,
    );

    // 13. Verify decoding (local test)
    console.log(`\n1️⃣3️⃣ Verifying Transaction Decoding:`);
    try {
      const decodedTx = Tx.decode(txBytes);
      console.log('  ✅ Transaction can be decoded locally');
      console.log(`  Messages: ${decodedTx.messages.length}`);
      console.log(`  Signatures: ${decodedTx.signatures.length}`);

      if (decodedTx.signatures.length > 0) {
        const sig = decodedTx.signatures[0];
        console.log(`  Signature details:`);
        console.log(`    - PubKey type: ${sig.pub_key?.type_url}`);
        console.log(`    - PubKey length: ${sig.pub_key?.value.length} bytes`);
        console.log(`    - Signature length: ${sig.signature.length} bytes`);
      }
    } catch (error) {
      console.error('  ❌ Failed to decode transaction locally:', error);
      throw new Error(`Transaction encoding verification failed: ${error}`);
    }

    // 14. Convert to base64 (for RPC)
    console.log(`\n1️⃣4️⃣ Converting to Base64:`);
    const txBase64 = uint8ArrayToBase64(txBytes);
    console.log(`  Base64 length: ${txBase64.length} characters`);
    console.log(`  Base64 (first 100): ${txBase64.substring(0, 100)}...`);

    // 15. Summary
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log('✅ Multisig Transaction Prepared Successfully!');
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 Summary:`);
    console.log(`  - Threshold: ${threshold}`);
    console.log(`  - Signatures collected: ${signatureCount}`);
    console.log(`  - Messages: ${messages.length}`);
    console.log(`  - Gas: ${gasWanted}`);
    console.log(`  - Fee: ${gasFee}`);
    console.log(`  - Tx size: ${txBytes.length} bytes`);
    console.log(`  - Ready for broadcast via transactionService.sendTransaction()`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    return {
      tx: aminoDocumentToTx, // Complete Tx object for transactionService.sendTransaction()
      txBytes, // Raw bytes
      txBase64, // Base64 encoded (for direct RPC calls)
    };
  }

  /**
   * Encode PubKeyMultisig to Protobuf format
   *
   * Protobuf structure:
   * message PubKeyMultisig {
   *   uint64 k = 1;              // threshold
   *   repeated Any pub_keys = 2; // public keys
   * }
   */
  private encodeMultisigPublicKey(threshold: number, pubKeys: Uint8Array[]): Uint8Array {
    const result: number[] = [];

    // Field 1: k (threshold) - uint64
    if (threshold !== 0) {
      result.push(0x08); // field 1, wire type 0 (varint)
      result.push(...this.encodeVarint(threshold));
    }

    // Field 2: pub_keys (repeated Any)
    for (const pubKey of pubKeys) {
      // 각 pubKey는 /tm.PubKeySecp256k1 타입으로 인코딩
      // PubKeySecp256k1 메시지에 pubKey 값 감싸기
      const pubKeySecp256k1 = new Uint8Array([
        0x0a, // field 1, wire type 2 (length-delimited)
        pubKey.length, // 길이
        ...pubKey, // 값
      ]);

      // Any 메시지에 PubKeySecp256k1 감싸기
      const anyBytes = this.encodeAny('/tm.PubKeySecp256k1', pubKeySecp256k1);
      result.push(0x12); // field 2, wire type 2 (length-delimited)
      result.push(...this.encodeVarint(anyBytes.length));
      result.push(...anyBytes);
    }

    return new Uint8Array(result);
  }

  /**
   * Encode Any message
   *
   * Protobuf structure:
   * message Any {
   *   string type_url = 1;
   *   bytes value = 2;
   * }
   */
  private encodeAny(typeUrl: string, value: Uint8Array): Uint8Array {
    const result: number[] = [];

    // Field 1: type_url (string)
    if (typeUrl) {
      result.push(0x0a); // field 1, wire type 2 (length-delimited)
      result.push(...this.encodeVarint(typeUrl.length));
      for (let i = 0; i < typeUrl.length; i++) {
        result.push(typeUrl.charCodeAt(i));
      }
    }

    // Field 2: value (bytes)
    if (value.length > 0) {
      // ✅ Wrap pubkey in PubKeySecp256k1 message
      const wrappedValue: number[] = [];
      wrappedValue.push(0x0a); // field 1 of PubKeySecp256k1, wire type 2
      wrappedValue.push(...this.encodeVarint(value.length));
      wrappedValue.push(...value);

      result.push(0x12); // field 2, wire type 2 (length-delimited)
      result.push(...this.encodeVarint(wrappedValue.length));
      result.push(...wrappedValue);
    }

    return new Uint8Array(result);
  }

  /**
   * Encode varint (variable-length integer)
   */
  private encodeVarint(value: number): number[] {
    const bytes: number[] = [];
    while (value >= 0x80) {
      bytes.push((value & 0x7f) | 0x80);
      value >>>= 7;
    }
    bytes.push(value);
    return bytes;
  }

  /**
   * Encode message value to Uint8Array
   */
  private encodeMessage(msg: any): Uint8Array {
    const msgType = msg['@type'] || msg.type;

    switch (msgType) {
      case MsgEndpoint.MSG_CALL:
      case '/vm.m_call': {
        const args: string[] =
          msg.value?.args || msg.args
            ? (msg.value?.args || msg.args).length === 0
              ? null
              : msg.value?.args || msg.args
            : null;

        const msgCall = MsgCall.create({
          args: args,
          caller: msg.value?.caller || msg.caller,
          func: msg.value?.func || msg.func,
          pkg_path: msg.value?.pkg_path || msg.pkg_path,
          send: msg.value?.send || msg.send || '',
          max_deposit: msg.value?.max_deposit || msg.max_deposit || '',
        });

        return MsgCall.encode(msgCall).finish();
      }

      case MsgEndpoint.MSG_SEND:
      case '/bank.MsgSend': {
        const msgSend = MsgSend.create(msg.value || msg);
        return MsgSend.encode(msgSend).finish();
      }

      case MsgEndpoint.MSG_ADD_PKG:
      case '/vm.m_addpkg': {
        const msgAddPackage = MsgAddPackage.create({
          creator: msg.value?.creator || msg.creator,
          send: msg.value?.send || msg.send || '',
          max_deposit: msg.value?.max_deposit || msg.max_deposit || '',
          package:
            msg.value?.package || msg.package
              ? this.createMemPackage(msg.value?.package || msg.package)
              : undefined,
        });

        return MsgAddPackage.encode(msgAddPackage).finish();
      }

      case MsgEndpoint.MSG_RUN:
      case '/vm.m_run': {
        const msgRun = MsgRun.create({
          caller: msg.value?.caller || msg.caller,
          send: msg.value?.send || msg.send || null,
          package:
            msg.value?.package || msg.package
              ? this.createMemPackage(msg.value?.package || msg.package)
              : undefined,
          max_deposit: msg.value?.max_deposit || msg.max_deposit || '',
        });

        return MsgRun.encode(msgRun).finish();
      }

      default: {
        throw new Error(`Unsupported message type: ${msgType}`);
      }
    }
  }

  /**
   * Create MemPackage from raw package data
   */
  private createMemPackage(memPackage: any): any {
    return MemPackage.create({
      name: memPackage.name,
      path: memPackage.path,
      files: memPackage.files.map((file: any) =>
        MemFile.create({
          name: file.name,
          body: file.body,
        }),
      ),
    });
  }

  private async getPublicKeyFromChain(address: string) {
    const provider = this.getGnoProvider();
    const accountInfo = await provider.getAccountInfo(address).catch(() => null);
    const accountPubKey = accountInfo?.publicKey;

    return accountPubKey;
  }

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
      return '1ugnot';
    }

    const coin = fee.amount[0];
    return `${coin.amount}${coin.denom}`;
  };

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
   * Validate MultisigTransactionDocument (New API)
   */
  private validateMultisigTransactionDocument(document: MultisigTransactionDocument): void {
    if (!document) {
      throw new Error('Document is required');
    }

    if (!document.tx) {
      throw new Error('Transaction is required');
    }

    if (!document.tx.msg || document.tx.msg.length === 0) {
      throw new Error('At least one message is required');
    }

    if (!document.multisigSignatures || document.multisigSignatures.length === 0) {
      throw new Error('At least one signature is required');
    }

    if (!document.multisigConfig) {
      throw new Error('Multisig config is required');
    }

    if (!document.multisigConfig.threshold) {
      throw new Error('Threshold is required');
    }

    if (!document.multisigConfig.signers || document.multisigConfig.signers.length === 0) {
      throw new Error('Signers are required');
    }
  }

  /**
   * Broadcast signed multisig transaction (commit mode)
   * Waits for transaction to be included in a block
   */
  async broadcastTxCommit(signedTx: Tx): Promise<BroadcastTxCommitResult> {
    console.log('\n📡 Broadcasting Multisig Transaction (Commit Mode)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      const provider = this.getGnoProvider();

      // Encode transaction to base64
      const txBytes = Tx.encode(signedTx).finish();
      const encodedTx: string = uint8ArrayToBase64(txBytes);

      console.log('  Tx bytes length:', txBytes.length);
      console.log('  Tx base64 length:', encodedTx.length);
      console.log('  Endpoint: broadcast_tx_commit');

      // Send transaction
      const result = await provider.sendTransaction(
        encodedTx,
        'broadcast_tx_commit' as keyof BroadcastTransactionMap,
      );

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ Broadcast Successful!');
      console.log('  Hash:', result.hash);
      console.log('  Height:', (result as BroadcastTxCommitResult).height);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      return result as BroadcastTxCommitResult;
    } catch (error) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ Broadcast Failed:', error);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      throw error;
    }
  }

  /**
   * Broadcast signed multisig transaction (sync mode)
   * Returns immediately after transaction is accepted into mempool
   */
  async broadcastTxSync(signedTx: Tx): Promise<BroadcastTxSyncResult> {
    console.log('\n📡 Broadcasting Multisig Transaction (Sync Mode)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
      const provider = this.getGnoProvider();

      // Encode transaction to base64
      const txBytes = Tx.encode(signedTx).finish();
      const encodedTx: string = uint8ArrayToBase64(txBytes);

      console.log('  Tx bytes length:', txBytes.length);
      console.log('  Tx base64 length:', encodedTx.length);
      console.log('  Endpoint: broadcast_tx_sync');

      // Send transaction
      const result = await provider.sendTransaction(
        encodedTx,
        'broadcast_tx_sync' as keyof BroadcastTransactionMap,
      );

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ Broadcast Successful!');
      console.log('  Hash:', result.hash);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

      return result as BroadcastTxSyncResult;
    } catch (error) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ Broadcast Failed:', error);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      throw error;
    }
  }
}
