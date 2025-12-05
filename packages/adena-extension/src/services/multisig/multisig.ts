import { defaultAddressPrefix } from '@gnolang/tm2-js-client';

import { WalletService } from '..';
import { GnoProvider } from '@common/provider/gno';

import {
  CreateMultisigDocumentParams,
  MultisigDocument,
  SignedDocument,
  StandardDocument,
} from '@inject/types';

import {
  MultisigAccount,
  MultisigConfig,
  createMultisigPublicKey,
  fromBase64,
  fromBech32,
} from 'adena-module';
import { DEFAULT_GAS_FEE, DEFAULT_GAS_WANTED } from '@common/constants/tx.constant';
import { GasToken } from '@common/constants/token.constant';

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
   * Create a signed document
   *
   * @param chainId
   * @param signedDocument
   * @returns
   */
  public createSignedDocument = async (
    chainId: string,
    signedDocument: SignedDocument,
  ): Promise<SignedDocument> => {
    return {
      ...signedDocument,
      chain_id: signedDocument.chain_id || chainId,
      fee: {
        gas: signedDocument.fee.gas || DEFAULT_GAS_WANTED.toString(),
        amount:
          signedDocument.fee.amount.length > 0
            ? signedDocument.fee.amount.map((fee) => ({
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
    };
  };

  private async getPublicKeyFromChain(address: string) {
    const provider = this.getGnoProvider();
    const accountInfo = await provider.getAccountInfo(address).catch(() => null);
    const accountPubKey = accountInfo?.publicKey;

    return accountPubKey;
  }
}
