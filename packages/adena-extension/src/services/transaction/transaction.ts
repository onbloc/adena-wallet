import { WalletError } from '@common/errors';
import { loadWallet } from '@services/wallet';
import { Transaction, uint8ArrayToArray, Wallet, WalletAccount, WalletAccountConfig } from 'adena-module';
import { GnoClient } from 'gno-client';
import { WalletService } from '..';

/**
 * This function creates a transaction.
 *
 * @param account WalletAccount instance
 * @param message message
 * @param gasWanted gaswanted
 * @param gasFee gas fee
 * @returns transaction value
 */
export const createTransaction = async (
  gnoClient: InstanceType<typeof GnoClient>,
  account: InstanceType<typeof WalletAccount>,
  message: any,
  gasWanted: number,
  gasFee?: number,
) => {
  const currentAccount = account.data.signerType === 'LEDGER' ?
    await createTransactionAccountByLedger(gnoClient, account) :
    await createTransactionAccount(gnoClient, account);
  const document = Transaction.generateDocument(currentAccount, [message], gasWanted, gasFee);
  const transactionFee = await Transaction.generateTransactionFee(
    currentAccount,
    gasWanted,
    gasFee,
  );
  const transactionSignature = await Transaction.generateSignature(currentAccount, document);
  const transaction = Transaction.builder()
    .fee(transactionFee)
    .messages([message])
    .signatures([transactionSignature])
    .memo('')
    .build();
  const transactionValue = uint8ArrayToArray(transaction.encodedValue);
  return transactionValue;
};

const createTransactionAccount = async (
  gnoClient: InstanceType<typeof GnoClient>,
  account: InstanceType<typeof WalletAccount>
) => {
  const accountInfo = await gnoClient.getAccount(account.getAddress());
  const currentAccount = new WalletAccount(account.data);
  try {
    currentAccount.setSigner(account.getSigner());
  } catch (e) {
    const wallet = await loadWallet();
    currentAccount.setSigner(wallet.getSigner());
  }
  currentAccount.setConfig(new WalletAccountConfig(gnoClient.config));
  currentAccount.updateByGno({
    accountNumber: accountInfo.accountNumber,
    sequence: accountInfo.sequence,
  });
  return currentAccount;
};

const createTransactionAccountByLedger = async (
  gnoClient: InstanceType<typeof GnoClient>,
  account: InstanceType<typeof WalletAccount>
) => {
  const accountInfo = await gnoClient.getAccount(account.getAddress());
  const currentAccount = new WalletAccount(account.data);
  const ledgerWallet = await Wallet.createByLedger([account.data.path]);
  await ledgerWallet.initAccounts();
  currentAccount.setSigner(ledgerWallet.getAccounts()[0].getSigner());
  currentAccount.setConfig(new WalletAccountConfig(gnoClient.config));
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
export const createTransactionByContract = async (
  gnoClient: InstanceType<typeof GnoClient>,
  account: InstanceType<typeof WalletAccount>,
  messages: Array<any>,
  gasWanted: number,
  gasFee?: number,
  memo?: string | undefined,
) => {
  const currentAccount = account.data.signerType === 'LEDGER' ?
    await createTransactionAccountByLedger(gnoClient, account) :
    await createTransactionAccount(gnoClient, account);
  const document = Transaction.generateDocument(currentAccount, messages, gasWanted, gasFee, memo);
  const transactionFee = await Transaction.generateTransactionFee(
    currentAccount,
    gasWanted,
    gasFee,
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

export const createTransactionData = async (
  gnoClient: InstanceType<typeof GnoClient>,
  account: InstanceType<typeof WalletAccount>,
  messages: Array<any>,
  gasWanted: number,
  gasFee?: number,
  memo?: string | undefined,
) => {
  const accountInfo = await gnoClient.getAccount(account.getAddress());
  const currentAccount = new WalletAccount(account.data);
  currentAccount.updateByGno({
    accountNumber: accountInfo.accountNumber,
    sequence: accountInfo.sequence,
  });
  currentAccount.setConfig(new WalletAccountConfig(gnoClient.config));
  const document = Transaction.generateDocument(currentAccount, messages, gasWanted, gasFee, memo);
  const transactionFee = await Transaction.generateTransactionFee(
    currentAccount,
    gasWanted,
    gasFee,
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
export const createAminoSign = async (
  gnoClient: InstanceType<typeof GnoClient>,
  accountAddress: string,
  messages: Array<any>,
  gasWanted: number,
  gasFee?: number,
  memo?: string | undefined,
) => {
  const accounts = await WalletService.loadAccounts();
  const account = accounts.find(
    (walletAccount: InstanceType<typeof WalletAccount>) =>
      walletAccount.getAddress() === accountAddress)?.clone();
  if (!account) {
    throw new WalletError('NOT_FOUND_ACCOUNT');
  }
  if (account.data.signerType === 'LEDGER') {
    throw new WalletError('FAILED_TO_LOAD');
  }

  const currentAccount = await createTransactionAccount(gnoClient, account);

  const accountInfo = await gnoClient.getAccount(accountAddress);
  currentAccount.updateByGno({
    address: accountInfo.address,
    publicKey: accountInfo.publicKey ?? '',
    accountNumber: accountInfo.accountNumber,
    sequence: accountInfo.sequence,
  });
  currentAccount.setConfig(new WalletAccountConfig(gnoClient.config));
  const signedDocumnet = Transaction.generateDocument(currentAccount, messages, gasWanted, gasFee, memo);
  const signAminoResponse = currentAccount.getSigner()?.signAmino(accountAddress, signedDocumnet);
  return signAminoResponse;
};

/**
 * This function sends a transaction to gnoland
 *
 * @param gnoClient gno api client
 * @param transaction created transaction
 */
export const sendTransaction = async (
  gnoClient: InstanceType<typeof GnoClient>,
  transaction: Array<number>,
) => {
  const result = await gnoClient.broadcastTxCommit(`${transaction}`);
  return result;
};
