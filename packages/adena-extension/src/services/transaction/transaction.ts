import { WalletError } from '@common/errors';
import { Transaction, TransactionBuilder, uint8ArrayToArray } from 'adena-module';
import { Account } from 'adena-module';
import { GnoClient } from 'gno-client';
import { ChainService, WalletAccountService, WalletService } from '..';

export class TransactionService {
  private gnoClient: InstanceType<typeof GnoClient> | null;

  private chainService: ChainService;

  private walletService: WalletService;

  private accountService: WalletAccountService;

  constructor(
    gnoClient: InstanceType<typeof GnoClient> | null,
    chainService: ChainService,
    walletService: WalletService,
    accountService: WalletAccountService,
  ) {
    this.gnoClient = gnoClient;
    this.chainService = chainService;
    this.walletService = walletService;
    this.accountService = accountService;
  }

  public setGnoClient(gnoClient: InstanceType<typeof GnoClient>) {
    this.gnoClient = gnoClient;
  }

  private getCurrentDenom = () => {
    return this.chainService.getCurrentNetwork().then((network) => network.token.minimalDenom);
  };

  private getGasAmount = async (gasFee?: number) => {
    const currentMinimalDenom = await this.getCurrentDenom();
    const gasFeeAmount = {
      value: `${gasFee ?? 1}`,
      denom: currentMinimalDenom,
    };
    return gasFeeAmount;
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
  public createTransaction = async (
    account: Account,
    message: any,
    gasWanted: number,
    gasFee?: number,
    memo?: string,
  ) => {
    if (!this.gnoClient) {
      throw new Error('Not found gno client');
    }
    const accountInfo = await this.gnoClient.getAccount(account.getAddress('g'));
    const chainId = this.gnoClient.chainId;
    const gasAmount = await this.getGasAmount(gasFee);
    const document = Transaction.generateDocument(
      accountInfo.accountNumber,
      accountInfo.sequence,
      chainId,
      [message],
      `${gasWanted}`,
      gasAmount,
      memo,
    );
    const wallet = await this.walletService.loadWallet();
    const signature = await Transaction.generateSignature(wallet.currentKeyring, document);
    const transaction = TransactionBuilder.builder()
      .signDoucment(document)
      .signatures([signature])
      .build();
    const transactionValue = uint8ArrayToArray(transaction.encodedValue);
    return transactionValue;
  };

  /**
   * This function creates a transaction.
   *
   * @param account Account instance
   * @param message message
   * @param gasWanted gaswanted
   * @returns transaction value
   */
  public createTransactionByContract = async (
    account: Account,
    messages: Array<any>,
    gasWanted: number,
    gasFee?: number,
    memo?: string | undefined,
  ) => {
    if (!this.gnoClient) {
      throw new Error('Not found gno client');
    }
    const accountInfo = await this.gnoClient.getAccount(account.getAddress('g'));
    const chainId = this.gnoClient.chainId;
    const gasAmount = await this.getGasAmount(gasFee);
    const document = Transaction.generateDocument(
      accountInfo.accountNumber,
      accountInfo.sequence,
      chainId,
      messages,
      `${gasWanted}`,
      gasAmount,
      memo,
    );
    const wallet = await this.walletService.loadWallet();
    const signature = await Transaction.generateSignature(wallet.currentKeyring, document);
    const transaction = TransactionBuilder.builder()
      .signDoucment(document)
      .signatures([signature])
      .build();
    const transactionValue = uint8ArrayToArray(transaction.encodedValue);
    return transactionValue;
  };

  public createTransactionData = async (
    account: Account,
    messages: Array<any>,
    gasWanted: number,
    gasFee?: number,
    memo?: string | undefined,
  ) => {
    if (!this.gnoClient) {
      throw new Error('Not found gno client');
    }
    const accountInfo = await this.gnoClient.getAccount(account.getAddress('g'));
    const chainId = this.gnoClient.chainId;
    const gasAmount = await this.getGasAmount(gasFee);
    const document = Transaction.generateDocument(
      accountInfo.accountNumber,
      accountInfo.sequence,
      chainId,
      [...messages],
      `${gasWanted}`,
      gasAmount,
      memo,
    );
    const transactionFee = await Transaction.generateTransactionFee(
      `${gasWanted}`,
      `${gasAmount.value}${gasAmount.denom}`,
    );
    return {
      messages,
      contracts: messages.map((message) => {
        return {
          type: message?.type,
          function: message?.value?.func,
          value: message?.value,
        };
      }),
      transactionFee,
      gasWanted: document.fee.gas,
      gasFee: `${document.fee.amount[0].amount}${document.fee.amount[0].denom}`,
      document,
    };
  };

  /**
   * This function creates a signed document.
   *
   * @param account Account instance
   * @param message message
   * @param gasWanted gaswanted
   * @returns signed document
   */
  public createAminoSign = async (
    accountAddress: string,
    messages: Array<any>,
    gasWanted: number,
    gasFee?: number,
    memo?: string | undefined,
  ) => {
    const accounts = await this.accountService.getAccounts();
    const account = accounts.find((account: Account) => account.getAddress('g') === accountAddress);
    if (!account) {
      throw new WalletError('NOT_FOUND_ACCOUNT');
    }
    if (account.type === 'LEDGER') {
      throw new WalletError('FAILED_TO_LOAD');
    }

    if (!this.gnoClient) {
      throw new Error('Not found gno client');
    }

    const accountInfo = await this.gnoClient.getAccount(accountAddress);
    const chainId = this.gnoClient.chainId;
    const gasAmount = await this.getGasAmount(gasFee);
    const signedDocumnet = Transaction.generateDocument(
      accountInfo.accountNumber,
      accountInfo.sequence,
      chainId,
      [...messages],
      `${gasWanted}`,
      gasAmount,
      memo,
    );
    const wallet = await this.walletService.loadWallet();
    const signAminoResponse = wallet.sign(signedDocumnet);
    return signAminoResponse;
  };

  /**
   * This function sends a transaction to gnoland
   *
   * @param gnoClient gno api client
   * @param transaction created transaction
   */
  public sendTransaction = async (transaction: Array<number>) => {
    if (!this.gnoClient) {
      throw new Error('Not found gno client');
    }

    const result = await this.gnoClient.broadcastTxCommit(`${transaction}`);
    return result;
  };
}
