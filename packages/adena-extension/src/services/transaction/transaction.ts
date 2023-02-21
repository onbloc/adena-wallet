import { WalletError } from '@common/errors';
import { ChainRepository } from '@repositories/common';
import { Transaction, uint8ArrayToArray, Wallet, WalletAccount } from 'adena-module';
import { GnoClient } from 'gno-client';
import { WalletAccountService, WalletService } from '..';

export class TransactionService {

  private gnoClient: InstanceType<typeof GnoClient> | null;

  private chainRepository: ChainRepository;

  private walletService: WalletService;

  private accountService: WalletAccountService;

  constructor(
    gnoClient: InstanceType<typeof GnoClient> | null,
    chainRepository: ChainRepository,
    walletService: WalletService,
    accountService: WalletAccountService
  ) {
    this.gnoClient = gnoClient;
    this.chainRepository = chainRepository;
    this.walletService = walletService;
    this.accountService = accountService;
  }

  private getCurrentDenom = () => {
    return this.chainRepository.getCurrentNetwork()
      .then(network => network.token.minimalDenom);
  }

  private getGasAmount = async (gasFee?: number) => {
    const currentMinimalDenom = await this.getCurrentDenom();
    const gasFeeAmount = {
      value: `${gasFee ?? 1}`,
      denom: currentMinimalDenom
    }
    return gasFeeAmount;
  }

  /**
   * This function creates a transaction.
   *
   * @param account WalletAccount instance
   * @param message message
   * @param gasWanted gaswanted
   * @param gasFee gas fee
   * @returns transaction value
   */
  public createTransaction = async (
    account: InstanceType<typeof WalletAccount>,
    message: any,
    gasWanted: number,
    gasFee?: number,
    memo?: string
  ) => {
    if (!this.gnoClient) {
      throw new Error("Not found gno client")
    }
    const currentAccount = account.data.signerType === 'LEDGER' ?
      await this.createTransactionAccountByLedger(account) :
      await this.createTransactionAccount(account);
    const chainId = await this.chainRepository.getCurrentChainId();
    const gasAmount = await this.getGasAmount(gasFee);
    const document = Transaction.generateDocument(
      currentAccount,
      chainId,
      [message],
      `${gasWanted}`,
      gasAmount,
      memo
    );
    const transactionFee = await Transaction.generateTransactionFee(
      `${gasWanted}`,
      `${gasAmount.value}${gasAmount.denom}`,
    );
    const transactionSignature = await Transaction.generateSignature(currentAccount, document);
    const transaction = Transaction.builder()
      .fee(transactionFee)
      .messages([message])
      .signatures([transactionSignature])
      .memo('')
      .build();
    console.log(document)
    const transactionValue = uint8ArrayToArray(transaction.encodedValue);
    return transactionValue;
  };

  private createTransactionAccount = async (
    account: InstanceType<typeof WalletAccount>
  ) => {
    if (!this.gnoClient) {
      throw new Error("Not found gno client")
    }
    const accountInfo = await this.gnoClient.getAccount(account.getAddress());
    const currentAccount = new WalletAccount(account.data);
    try {
      const wallet = await this.walletService.loadWallet();
      currentAccount.setSigner(wallet.getSigner());
    } catch (e) {
      console.log(e);
    }
    currentAccount.updateByGno({
      accountNumber: accountInfo.accountNumber,
      sequence: accountInfo.sequence,
    });
    return currentAccount;
  };

  private createTransactionAccountByLedger = async (
    account: InstanceType<typeof WalletAccount>
  ) => {
    if (!this.gnoClient) {
      throw new Error("Not found gno client")
    }
    const accountInfo = await this.gnoClient.getAccount(account.getAddress());
    const currentAccount = new WalletAccount(account.data);
    const ledgerWallet = await Wallet.createByLedger([account.data.path]);
    await ledgerWallet.initAccounts();
    currentAccount.setSigner(ledgerWallet.getAccounts()[0].getSigner());
    currentAccount.updateByGno({
      accountNumber: accountInfo.accountNumber,
      sequence: accountInfo.sequence,
    });
    return currentAccount;
  };

  /**
   * This function creates a transaction.
   *
   * @param account WalletAccount instance
   * @param message message
   * @param gasWanted gaswanted
   * @returns transaction value
   */
  public createTransactionByContract = async (
    account: InstanceType<typeof WalletAccount>,
    messages: Array<any>,
    gasWanted: number,
    gasFee?: number,
    memo?: string | undefined,
  ) => {
    if (!this.gnoClient) {
      throw new Error("Not found gno client")
    }
    const currentAccount = account.data.signerType === 'LEDGER' ?
      await this.createTransactionAccountByLedger(account) :
      await this.createTransactionAccount(account);
    const chainId = await this.chainRepository.getCurrentChainId();
    const gasAmount = await this.getGasAmount(gasFee);
    const document = Transaction.generateDocument(
      currentAccount,
      chainId,
      [...messages],
      `${gasWanted}`,
      gasAmount,
      memo
    );
    const transactionFee = await Transaction.generateTransactionFee(
      `${gasWanted}`,
      `${gasAmount.value}${gasAmount.denom}`,
    );
    const transactionSignature = await Transaction.generateSignature(currentAccount, document);
    const transaction = Transaction.builder()
      .fee(transactionFee)
      .messages(messages)
      .signatures([transactionSignature])
      .memo(memo ?? '')
      .build();
    const transactionValue = uint8ArrayToArray(transaction.encodedValue);
    return transactionValue;
  }

  public createTransactionData = async (
    account: InstanceType<typeof WalletAccount>,
    messages: Array<any>,
    gasWanted: number,
    gasFee?: number,
    memo?: string | undefined,
  ) => {
    if (!this.gnoClient) {
      throw new Error("Not found gno client")
    }
    const accountInfo = await this.gnoClient.getAccount(account.getAddress());
    const currentAccount = new WalletAccount(account.data);
    currentAccount.updateByGno({
      accountNumber: accountInfo.accountNumber,
      sequence: accountInfo.sequence,
    });
    const chainId = await this.chainRepository.getCurrentChainId();
    const gasAmount = await this.getGasAmount(gasFee);
    const document = Transaction.generateDocument(
      currentAccount,
      chainId,
      [...messages],
      `${gasWanted}`,
      gasAmount,
      memo
    );
    const transactionFee = await Transaction.generateTransactionFee(
      `${gasWanted}`,
      `${gasAmount.value}${gasAmount.denom}`,
    );
    return {
      messages,
      contracts: messages.map(message => {
        return {
          type: message?.type,
          function: message?.value?.func,
          value: message?.value
        }
      }),
      transactionFee,
      gasWanted: document.fee.gas,
      gasFee: `${document.fee.amount[0].amount}${document.fee.amount[0].denom}`,
      document
    };
  };

  /**
   * This function creates a signed document.
   *
   * @param account WalletAccount instance
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
    const accounts = await this.accountService.loadAccounts();
    const account = accounts.find(
      (walletAccount: InstanceType<typeof WalletAccount>) =>
        walletAccount.getAddress() === accountAddress)?.clone();
    if (!account) {
      throw new WalletError('NOT_FOUND_ACCOUNT');
    }
    if (account.data.signerType === 'LEDGER') {
      throw new WalletError('FAILED_TO_LOAD');
    }

    if (!this.gnoClient) {
      throw new Error("Not found gno client")
    }

    const currentAccount = await this.createTransactionAccount(account);

    const accountInfo = await this.gnoClient.getAccount(accountAddress);
    currentAccount.updateByGno({
      address: accountInfo.address,
      publicKey: accountInfo.publicKey ?? '',
      accountNumber: accountInfo.accountNumber,
      sequence: accountInfo.sequence,
    });
    const chainId = await this.chainRepository.getCurrentChainId();
    const gasAmount = await this.getGasAmount(gasFee);
    const signedDocumnet = Transaction.generateDocument(
      currentAccount,
      chainId,
      [...messages],
      `${gasWanted}`,
      gasAmount,
      memo
    );
    const signAminoResponse = currentAccount.getSigner()?.signAmino(accountAddress, signedDocumnet);
    return signAminoResponse;
  };

  /**
   * This function sends a transaction to gnoland
   *
   * @param gnoClient gno api client
   * @param transaction created transaction
   */
  public sendTransaction = async (
    transaction: Array<number>,
  ) => {
    if (!this.gnoClient) {
      throw new Error("Not found gno client")
    }

    const result = await this.gnoClient.broadcastTxCommit(`${transaction}`);
    return result;
  };

}
