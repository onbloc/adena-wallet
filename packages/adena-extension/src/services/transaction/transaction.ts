import { StdSignature, TransactionBuilder, uint8ArrayToArray } from 'adena-module';
import { Account } from 'adena-module';
import { GnoClient } from 'gno-client';
import { WalletService } from '..';
import { StdSignDoc } from 'adena-module/src';
import { Document } from 'adena-module/src/amino/document';

export class TransactionService {
  private walletService: WalletService;

  constructor(walletService: WalletService) {
    this.walletService = walletService;
  }

  private getGasAmount = async (gasFee?: number) => {
    const gasFeeAmount = {
      value: `${gasFee ?? 1}`,
      denom: 'ugnot',
    };
    return gasFeeAmount;
  };

  public createDocument = async (
    gnoClient: GnoClient,
    account: Account,
    messages: Array<any>,
    gasWanted: number,
    gasFee?: number,
    memo?: string | undefined,
  ) => {
    const accountInfo = await gnoClient.getAccount(account.getAddress('g'));
    const chainId = gnoClient.chainId;
    const gasAmount = await this.getGasAmount(gasFee);
    return Document.createDocument(
      accountInfo.accountNumber,
      accountInfo.sequence,
      chainId,
      messages,
      `${gasWanted}`,
      gasAmount,
      memo || '',
    );
  };

  public createSignature = async (account: Account, document: StdSignDoc) => {
    const wallet = await this.walletService.loadWallet();
    const { signature } = await wallet.signByAccountId(account.id, document);
    return signature;
  };

  public createSignDocument = async (
    gnoClient: GnoClient,
    account: Account,
    messages: Array<any>,
    gasWanted: number,
    gasFee?: number,
    memo?: string | undefined,
  ) => {
    const document = await this.createDocument(
      gnoClient,
      account,
      messages,
      gasWanted,
      gasFee,
      memo,
    );
    const signature = await this.createSignature(account, document);
    return { document, signature };
  };

  /**
   * This function creates a transaction.
   *
   * @param account Account instance
   * @param message message
   * @param gasWanted gaswanted
   * @param gasFee gas fee
   * @returns transaction value
   */
  public createTransaction = (document: StdSignDoc, signature: StdSignature) => {
    const transaction = TransactionBuilder.builder()
      .signDoucment(document)
      .signatures([signature])
      .build();
    const transactionValue = uint8ArrayToArray(transaction.encodedValue);
    return transactionValue;
  };

  /**
   * This function sends a transaction to gnoland
   *
   * @param gnoClient gno api client
   * @param transaction created transaction
   */
  public sendTransaction = async (gnoClient: GnoClient, transaction: Array<number>) => {
    const result = await gnoClient.broadcastTxCommit(`${transaction}`);
    return result;
  };
}
