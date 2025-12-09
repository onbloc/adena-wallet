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

import { WalletService } from '..';
import { GnoProvider } from '@common/provider/gno';
import { DEFAULT_GAS_FEE, DEFAULT_GAS_WANTED } from '@common/constants/tx.constant';
import { GasToken } from '@common/constants/token.constant';

import { CreateMultisigDocumentParams, MultisigDocument, StandardDocument } from '@inject/types';

import {
  MultisigAccount,
  MultisigConfig,
  createMultisigPublicKey,
  fromBase64,
  fromBech32,
} from 'adena-module';

import { Multisignature } from './multisignature';

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
    const { signers, threshold } = config;

    // Get signer public keys from chain
    const signerPublicKeys: Uint8Array[] = [];
    for (const address of signers) {
      const publicKeyInfo = await this.getPublicKeyFromChain(address);

      if (!publicKeyInfo?.value) {
        throw new Error(
          `Public key not found for address: ${address}. ` +
            `The account may not have sent any transactions yet.`,
        );
      }

      const publicKeyBytes = fromBase64(publicKeyInfo.value);
      signerPublicKeys.push(publicKeyBytes);
    }

    // Create multisig public key (Amino encoded)
    const { address: multisigAddress, publicKey: multisigPubKey } = createMultisigPublicKey(
      signerPublicKeys,
      threshold,
      defaultAddressPrefix,
    );

    // Extract address bytes from bech32 address
    const { data: addressBytes } = fromBech32(multisigAddress);

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
    };
  };

  /**
   * Create a multisig document
   *
   * @param account - Account to get MultisigAccount info
   * @param params - CreateMultisigDocumentParams
   * @returns MultisigDocument with empty signatures array
   */
  public createMultisigDocument = async (
    account: MultisigAccount,
    params: CreateMultisigDocumentParams,
  ): Promise<MultisigDocument> => {
    const provider = this.getGnoProvider();
    const address = await account.getAddress(defaultAddressPrefix);
    const accountInfo = await provider.getAccountInfo(address).catch(() => null);
    const accountNumber = accountInfo?.accountNumber ?? 0;
    const accountSequence = accountInfo?.sequence ?? 0;
    const multisigConfig = account.multisigConfig;

    const document: StandardDocument = {
      msgs: params.msgs,
      fee: {
        gas: params.fee.gas || DEFAULT_GAS_WANTED.toString(),
        amount:
          params.fee.amount.length > 0
            ? params.fee.amount.map((fee) => ({
                ...fee,
                amount: fee.amount || DEFAULT_GAS_FEE.toString(),
                denom: fee.denom || GasToken.denom,
              }))
            : [
                {
                  amount: DEFAULT_GAS_FEE.toString(),
                  denom: GasToken.denom,
                },
              ],
      },
      chain_id: params.chain_id,
      memo: params.memo || '',
      account_number: accountNumber.toString(),
      sequence: accountSequence.toString(),
    };

    return {
      document,
      signatures: [],
      multisigConfig,
    };
  };

  /**
   * Create a multisig signed document from existing signed document
   *
   * This method is used when other signers need to add their signatures
   * to a multisig document that was already created.
   *
   * @param chainId - Chain ID
   * @param multisigDocument - Existing MultisigDocument with signatures
   * @returns MultisigDocument with validated fee and chain_id
   */
  public createMultisigSignedDocument = async (
    chainId: string,
    multisigDocument: MultisigDocument,
  ): Promise<MultisigDocument> => {
    return {
      ...multisigDocument,
      document: {
        ...multisigDocument.document,
        chain_id: multisigDocument.document.chain_id || chainId,
        fee: {
          gas: multisigDocument.document.fee.gas || DEFAULT_GAS_WANTED.toString(),
          amount:
            multisigDocument.document.fee.amount.length > 0
              ? multisigDocument.document.fee.amount.map((fee) => ({
                  ...fee,
                  amount: fee.amount || DEFAULT_GAS_FEE.toString(),
                  denom: fee.denom || GasToken.denom,
                }))
              : [
                  {
                    amount: DEFAULT_GAS_FEE.toString(),
                    denom: GasToken.denom,
                  },
                ],
        },
      },
    };
  };

  /**
   * Broadcast a multisig transaction
   *
   * @param multisigDocument - MultisigDocument with collected signatures
   * @param commit - Use broadcastTxCommit (true) or broadcastTxSync (false)
   * @returns Transaction hash and height
   */
  public broadcastMultisigTransaction = async (
    currentAccount: MultisigAccount,
    multisigDocument: MultisigDocument,
    commit: boolean = true,
  ) => {
    const provider = this.getGnoProvider();
    const { document, signatures, multisigConfig } = multisigDocument;

    // 1. Validate enough signatures
    if (signatures.length < multisigConfig.threshold) {
      throw new Error(
        `Not enough signatures. Required: ${multisigConfig.threshold}, Got: ${signatures.length}`,
      );
    }

    // 2. Get public keys for all signers
    const signerPublicKeys: Uint8Array[] = [];
    for (const address of multisigConfig.signers) {
      const publicKeyInfo = await this.getPublicKeyFromChain(address);
      if (!publicKeyInfo?.value) {
        throw new Error(`Public key not found for address: ${address}`);
      }
      const publicKeyBytes = fromBase64(publicKeyInfo.value);
      signerPublicKeys.push(publicKeyBytes);
    }

    // 3. Create multisig public key (Amino encoded bytes)
    const { publicKey: multisigPubKeyAmino } = createMultisigPublicKey(
      signerPublicKeys,
      multisigConfig.threshold,
      defaultAddressPrefix,
    );

    console.log(currentAccount, multisigPubKeyAmino, 'currentAccount, multisigPubKeyAmino');
    // 4. Create Multisignature and add all signatures
    const multisig = new Multisignature(signerPublicKeys.length);

    for (const signature of signatures) {
      if (!signature.pubKey.value) {
        throw new Error('Signature missing public key value');
      }

      const sigPubKeyRaw = fromBase64(signature.pubKey.value);
      const sigPubKey = sigPubKeyRaw.slice(2); // Remove 0x0a21 prefix
      const sig = fromBase64(signature.signature);

      console.log(sigPubKeyRaw, sigPubKey, sig, 'sigsigsig');

      multisig.addSignatureFromPubKey(sig, sigPubKey, signerPublicKeys);
    }

    // 5. Marshal multisig signature (Amino encoded)
    const multisigSignature = multisig.marshal();
    console.log(multisigSignature, 'multisigSignaturemultisigSignature');

    // 6. Create Tx messages
    const messages: Any[] = document.msgs.map((msg) => {
      const msgType = msg['@type'] || msg.type;
      const msgValue = this.encodeMessage(msg);

      return Any.create({
        type_url: msgType,
        value: msgValue,
      });
    });
    console.log(messages, 'messagesmessagesmessages');

    // 7. Create Tx object
    const tx: Tx = {
      messages,
      fee: TxFee.create({
        gas_wanted: document.fee.gas,
        gas_fee: document.fee.amount
          .map((feeAmount) => `${feeAmount.amount}${feeAmount.denom}`)
          .join(','),
      }),
      signatures: [
        TxSignature.create({
          pub_key: Any.create({
            type_url: '/tm.PubKeyMultisig',
            value: multisigPubKeyAmino,
          }),
          signature: multisigSignature,
        }),
      ],
      memo: document.memo || '',
    };

    console.log('=== TX DEBUG ===');
    console.log('tx messages:', tx.messages.length);
    console.log('tx fee:', tx.fee);
    console.log('tx signatures:', tx.signatures.length);
    console.log('tx memo:', tx.memo);
    console.log('multisig pubkey length:', multisigPubKeyAmino.length);

    // 8. Encode and broadcast transaction
    let result: BroadcastTxCommitResult | BroadcastTxSyncResult;
    let result2: BroadcastTxCommitResult | BroadcastTxSyncResult;
    try {
      const txBase64 = uint8ArrayToBase64(Tx.encode(tx).finish());
      const endpoint = commit ? 'broadcast_tx_commit' : 'broadcast_tx_sync';
      result = await provider.sendTransaction(txBase64, endpoint as keyof BroadcastTransactionMap);
      result2 = await provider.sendTransactionSync(txBase64);
    } catch (error) {
      console.error('Broadcast error:', error);
      throw error;
    }

    console.log('result:', result);
    console.log('result2:', result2);

    // 9. Check result
    if ('error' in result && result.error) {
      throw new Error(`Transaction failed: ${JSON.stringify(result.error)}`);
    }

    // 10. Return hash and height
    return {
      hash: result.hash,
      height: 'height' in result ? result.height : undefined,
    };
  };

  /**
   * Encode message value to Uint8Array
   */
  private encodeMessage(msg: any): Uint8Array {
    const msgType = msg['@type'] || msg.type;

    switch (msgType) {
      case MsgEndpoint.MSG_CALL:
      case '/vm.m_call': {
        const args: string[] = msg.value.args
          ? msg.value.args.length === 0
            ? null
            : msg.value.args
          : null;

        const msgCall = MsgCall.create({
          args: args,
          caller: msg.value.caller,
          func: msg.value.func,
          pkg_path: msg.value.pkg_path,
          send: msg.value.send || '',
          max_deposit: msg.value.max_deposit || '',
        });

        return MsgCall.encode(msgCall).finish();
      }

      case MsgEndpoint.MSG_SEND:
      case '/bank.MsgSend': {
        const msgSend = MsgSend.create(msg.value);
        return MsgSend.encode(msgSend).finish();
      }

      case MsgEndpoint.MSG_ADD_PKG:
      case '/vm.m_addpkg': {
        const msgAddPackage = MsgAddPackage.create({
          creator: msg.value.creator,
          send: msg.value.send || '',
          max_deposit: msg.value?.max_deposit || '',
          package: msg.value.package ? this.createMemPackage(msg.value.package) : undefined,
        });

        return MsgAddPackage.encode(msgAddPackage).finish();
      }

      case MsgEndpoint.MSG_RUN:
      case '/vm.m_run': {
        const msgRun = MsgRun.create({
          caller: msg.value.caller,
          send: msg.value.send || null,
          package: msg.value.package ? this.createMemPackage(msg.value.package) : undefined,
          max_deposit: msg.value?.max_deposit || '',
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
}
