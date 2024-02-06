import { useCallback, useMemo, useState } from 'react';
import { RawTx, strToSignedTx } from 'adena-module';
import { Tx } from '@gnolang/tm2-js-client';

import { makeGnotAmountByRaw } from '@common/utils/amount-utils';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import useAppNavigate from '@hooks/use-app-navigate';
import { RoutePath } from '@types';

export type BroadcastTransactionState = 'UPLOAD_TRANSACTION' | 'LOADING' | 'FAILED' | 'SUCCESS';

export interface TransactionDisplayInfo {
  name: string;
  value: string;
  type: 'TEXT' | 'COIN' | 'ADDRESS';
  extra: string | null;
}

function makeTransactionInfo(
  name: string,
  value: string,
  type: 'TEXT' | 'COIN' | 'ADDRESS' = 'TEXT',
  extra: string | null = null,
): TransactionDisplayInfo {
  return {
    name,
    value,
    type,
    extra,
  };
}

function makeTypeName(rawTx: RawTx): string {
  const message = rawTx.msg[0];
  switch (message['@type']) {
    case '/bank.MsgSend':
      return 'Send';
    case '/vm.m_call':
      return 'Contract Interaction';
    case '/vm.m_addpkg':
      return 'Add Package';
    case '/vm.m_run':
      return 'Run Transaction';
    default:
      return 'Contract Interaction';
  }
}

function mapBankSendTransactionInfo(rawTx: RawTx): TransactionDisplayInfo[] {
  const message = rawTx.msg[0] as any;
  const amount = makeGnotAmountByRaw(message.amount);
  const amountStr = `${amount?.value} ${amount?.denom}`;
  const networkFee = makeGnotAmountByRaw(rawTx.fee.gas_fee);
  const networkFeeStr = `${networkFee?.value} ${networkFee?.denom}`;
  const extraInfo = rawTx.msg.length > 1 ? `${rawTx.msg.length}` : '';

  return [
    makeTransactionInfo('Type', makeTypeName(rawTx), 'TEXT', extraInfo),
    makeTransactionInfo('To', message.to_address, 'ADDRESS'),
    makeTransactionInfo('Amount', amountStr),
    makeTransactionInfo('Network Fee', networkFeeStr),
  ];
}

function mapVmCallTransactionInfo(rawTx: RawTx): TransactionDisplayInfo[] {
  const message = rawTx.msg[0] as any;
  const networkFee = makeGnotAmountByRaw(rawTx.fee.gas_fee);
  const networkFeeStr = `${networkFee?.value} ${networkFee?.denom}`;
  const extraInfo = rawTx.msg.length > 1 ? `${rawTx.msg.length}` : '';

  return [
    makeTransactionInfo('Type', makeTypeName(rawTx), 'TEXT', extraInfo),
    makeTransactionInfo('Path', message.pkg_path),
    makeTransactionInfo('Function', message.func),
    makeTransactionInfo('Network Fee', networkFeeStr),
  ];
}

function mapVmAddPackageTransactionInfo(rawTx: RawTx): TransactionDisplayInfo[] {
  const message = rawTx.msg[0] as any;
  const networkFee = makeGnotAmountByRaw(rawTx.fee.gas_fee);
  const networkFeeStr = `${networkFee?.value} ${networkFee?.denom}`;
  const extraInfo = rawTx.msg.length > 1 ? `${rawTx.msg.length}` : '';

  return [
    makeTransactionInfo('Type', makeTypeName(rawTx), 'TEXT', extraInfo),
    makeTransactionInfo('Path', message.package.Path),
    makeTransactionInfo('Name', message.package.Name),
    makeTransactionInfo('Network Fee', networkFeeStr),
  ];
}

function mapTransactionInfo(rawTx: RawTx): TransactionDisplayInfo[] {
  const messages = rawTx.msg;
  if (messages[0]['@type'] === '/bank.MsgSend') {
    return mapBankSendTransactionInfo(rawTx);
  }
  if (messages[0]['@type'] === '/vm.m_addpkg') {
    return mapVmAddPackageTransactionInfo(rawTx);
  }
  if (messages[0]['@type'] === '/vm.m_call') {
    return mapVmCallTransactionInfo(rawTx);
  }
  return mapVmCallTransactionInfo(rawTx);
}

export interface UseBroadcastTransactionScreenReturn {
  transaction: Tx | null;
  broadcastTransactionState: BroadcastTransactionState;
  transactionInfos: TransactionDisplayInfo[] | null;
  rawTransaction: string;
  broadcast: () => Promise<boolean>;
  uploadTransaction: (text: string) => boolean;
}

const useBroadcastTransactionScreen = (): UseBroadcastTransactionScreenReturn => {
  const { wallet } = useWalletContext();
  const { transactionService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const { navigate } = useAppNavigate();
  const [broadcastTransactionState, setBroadcastTransactionState] = useState<
    BroadcastTransactionState
  >('UPLOAD_TRANSACTION');
  const [transaction, setTransaction] = useState<Tx | null>(null);
  const [rawTransaction, setRawTransaction] = useState<RawTx | null>(null);

  const transactionInfos = useMemo(() => {
    if (!rawTransaction || rawTransaction.msg.length === 0) {
      return null;
    }
    return mapTransactionInfo(rawTransaction);
  }, [rawTransaction]);

  const rawTransactionStr = useMemo(() => {
    if (!rawTransaction) {
      return '';
    }
    return JSON.stringify(rawTransaction, null, 2);
  }, [rawTransaction]);

  const uploadTransaction = (text: string): boolean => {
    try {
      const transaction = strToSignedTx(text);
      setTransaction(transaction);
      setRawTransaction(JSON.parse(text));
      return transaction !== null;
    } catch (error) {
      setTransaction(null);
      setRawTransaction(null);
      console.error(error);
      return false;
    }
  };

  const broadcast = useCallback(async () => {
    if (!transaction || !wallet || !currentAccount) {
      return false;
    }
    setBroadcastTransactionState('LOADING');
    const isSuccessBroadcasting = await transactionService
      .sendTransaction(wallet, currentAccount, transaction, true)
      .then((response) => {
        return Boolean(response?.hash);
      })
      .catch((e) => {
        console.error(e);
        return false;
      });

    if (isSuccessBroadcasting) {
      navigate(RoutePath.History);
    } else {
      setBroadcastTransactionState('FAILED');
    }
    return isSuccessBroadcasting;
  }, [transaction]);

  return {
    transaction,
    broadcastTransactionState,
    transactionInfos,
    rawTransaction: rawTransactionStr,
    broadcast,
    uploadTransaction,
  };
};

export default useBroadcastTransactionScreen;
