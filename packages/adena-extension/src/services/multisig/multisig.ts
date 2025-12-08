import {
  defaultAddressPrefix,
  Tx,
  uint8ArrayToBase64,
  BroadcastTxCommitResult,
  BroadcastTxSyncResult,
  TransactionEndpoint,
} from '@gnolang/tm2-js-client';
import { TxSignature, Any } from '@gnolang/tm2-js-client';

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
  documentToTx,
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
   * @returns Multisig account address and addressBytes
   */
  public createMultisigAccount = async (config: MultisigConfig) => {
    const { signers, threshold } = config;

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

    const { address: multisigAddress } = createMultisigPublicKey(
      signerPublicKeys,
      threshold,
      defaultAddressPrefix,
    );

    const { data: addressBytes } = fromBech32(multisigAddress);

    return {
      multisigAddress: multisigAddress,
      multisigAddressBytes: addressBytes,
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
    multisigDocument: MultisigDocument,
    commit: boolean = true,
  ) => {
    const provider = this.getGnoProvider();
    const { document, signatures, multisigConfig } = multisigDocument;

    // ✅ 1. Validate enough signatures
    if (signatures.length < multisigConfig.threshold) {
      throw new Error(
        `Not enough signatures. Required: ${multisigConfig.threshold}, Got: ${signatures.length}`,
      );
    }

    // ✅ 2. Get public keys for all signers
    const signerPublicKeys: Uint8Array[] = [];
    for (const address of multisigConfig.signers) {
      const publicKeyInfo = await this.getPublicKeyFromChain(address);
      if (!publicKeyInfo?.value) {
        throw new Error(`Public key not found for address: ${address}`);
      }
      const publicKeyBytes = fromBase64(publicKeyInfo.value);
      signerPublicKeys.push(publicKeyBytes);
    }

    // ✅ 3. Create multisig public key
    const { publicKey: multisigPubKey } = createMultisigPublicKey(
      signerPublicKeys,
      multisigConfig.threshold,
      defaultAddressPrefix,
    );

    // ✅ 4. Create Multisignature and add all signatures
    const multisig = new Multisignature(signerPublicKeys.length);

    for (const signature of signatures) {
      if (!signature.pubKey.value) {
        throw new Error('Signature missing public key value');
      }

      const sigPubKeyRaw = fromBase64(signature.pubKey.value);
      const sigPubKey = sigPubKeyRaw.slice(2); // 0x0a21 제거
      const sig = fromBase64(signature.signature);

      multisig.addSignatureFromPubKey(sig, sigPubKey, signerPublicKeys);
    }

    // ✅ 5. Marshal multisig signature
    const multisigSignature = multisig.marshal();

    // ✅ 6. Convert Document to Tx (기존 함수 사용!)
    const tx = documentToTx(document);

    // ✅ 7. Add multisig signature to Tx
    tx.signatures = [
      TxSignature.create({
        pub_key: Any.create({
          type_url: '/tm.PubKeyMultisig',
          value: multisigPubKey,
        }),
        signature: multisigSignature,
      }),
    ];

    console.log('=== TX DEBUG ===');
    console.log('tx messages:', tx.messages.length);
    console.log('tx fee:', tx.fee);
    console.log('tx signatures:', tx.signatures.length);
    console.log('tx memo:', tx.memo);

    // ✅ 8. Encode and broadcast transaction
    let result: BroadcastTxCommitResult | BroadcastTxSyncResult;
    try {
      const txBase64 = uint8ArrayToBase64(Tx.encode(tx).finish());

      console.log('txBase64:', txBase64);
      console.log('txBase64 length:', Buffer.from(txBase64, 'base64').length);

      const endpoint = commit ? 'broadcast_tx_commit' : 'broadcast_tx_sync';
      result = await provider.sendTransaction(
        txBase64,
        endpoint as TransactionEndpoint.BROADCAST_TX_SYNC | TransactionEndpoint.BROADCAST_TX_COMMIT,
      );
    } catch (error) {
      console.error('Broadcast error:', error);
      throw error;
    }

    console.log('result:', result);

    // ✅ 9. Check result
    if ('error' in result && result.error) {
      throw new Error(`Transaction failed: ${JSON.stringify(result.error)}`);
    }

    // ✅ 10. Return hash and height
    return {
      hash: result.hash,
      height: 'height' in result ? result.height : undefined,
    };
  };

  private async getPublicKeyFromChain(address: string) {
    const provider = this.getGnoProvider();
    const accountInfo = await provider.getAccountInfo(address).catch(() => null);
    const accountPubKey = accountInfo?.publicKey;

    return accountPubKey;
  }
}
