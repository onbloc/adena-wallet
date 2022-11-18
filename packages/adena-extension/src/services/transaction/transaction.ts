import { Transaction, uint8ArrayToArray, WalletAccount, WalletAccountConfig } from 'adena-wallet';
import { GnoClient } from 'gno-client';

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
  const accountInfo = await gnoClient.getAccount(account.getAddress());
  const currentAccount = new WalletAccount(account.data);
  currentAccount.setSigner(account.getSigner());
  currentAccount.updateByGno({
    accountNumber: accountInfo.accountNumber,
    sequence: accountInfo.sequence,
  });
  const document = Transaction.generateDocument(currentAccount, message, gasWanted, gasFee);
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
  message: any,
  gasWanted: number,
  gasFee?: number,
  memo?: string | undefined,
) => {
  const accountInfo = await gnoClient.getAccount(account.getAddress());
  const currentAccount = new WalletAccount(account.data);
  currentAccount.setSigner(account.getSigner());
  currentAccount.updateByGno({
    accountNumber: accountInfo.accountNumber,
    sequence: accountInfo.sequence,
  });
  currentAccount.setConfig(new WalletAccountConfig(gnoClient.config));
  const document = Transaction.generateDocument(currentAccount, message, gasWanted, gasFee);
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
    .memo(memo ?? '')
    .build();
  const transactionValue = uint8ArrayToArray(transaction.encodedValue);
  return {
    value: transactionValue,
    contractType: message.type,
    contractFunction: message.value.func,
    gasWanted: document.fee.gas,
    gasFee: `${document.fee.amount[0].amount}${document.fee.amount[0].denom}`,
  };
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
