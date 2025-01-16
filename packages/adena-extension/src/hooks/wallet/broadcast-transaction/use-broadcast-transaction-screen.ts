import { MsgEndpoint } from '@gnolang/gno-js-client';
import { Tx } from '@gnolang/tm2-js-client';
import {
  RawBankSendMessage,
  RawTx,
  RawVmAddPackageMessage,
  RawVmCallMessage,
  RawVmRunMessage,
  strToSignedTx,
} from 'adena-module';
import { useCallback, useMemo, useState } from 'react';

import { makeGnotAmountByRaw } from '@common/utils/amount-utils';
import useAppNavigate from '@hooks/use-app-navigate';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
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
    case MsgEndpoint.MSG_SEND:
      return 'Send';
    case MsgEndpoint.MSG_CALL:
      return 'Contract Interaction';
    case MsgEndpoint.MSG_ADD_PKG:
      return 'Add Package';
    case MsgEndpoint.MSG_RUN:
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
    makeTransactionInfo('Path', message.package?.path || message.package?.Path),
    makeTransactionInfo('Name', message.package?.name || message.package?.Name),
    makeTransactionInfo('Network Fee', networkFeeStr),
  ];
}

function mapTransactionInfo(rawTx: RawTx): TransactionDisplayInfo[] {
  const messages = rawTx.msg;
  if (messages[0]['@type'] === MsgEndpoint.MSG_SEND) {
    return mapBankSendTransactionInfo(rawTx);
  }
  if (messages[0]['@type'] === MsgEndpoint.MSG_ADD_PKG) {
    return mapVmAddPackageTransactionInfo(rawTx);
  }
  if (messages[0]['@type'] === MsgEndpoint.MSG_CALL) {
    return mapVmCallTransactionInfo(rawTx);
  }
  return mapVmCallTransactionInfo(rawTx);
}

function matchTransactionCaller(rawTx: RawTx, caller: string): boolean {
  const messages = rawTx.msg;
  const invalidedMatch = messages.some((message) => {
    switch (message['@type']) {
      case MsgEndpoint.MSG_SEND: {
        const current = message as RawBankSendMessage;
        if (!current?.from_address) {
          return true;
        }
        return current.from_address !== caller;
      }
      case MsgEndpoint.MSG_CALL: {
        const current = message as RawVmCallMessage;
        if (!current?.caller) {
          return true;
        }
        return current.caller !== caller;
      }
      case MsgEndpoint.MSG_ADD_PKG: {
        const current = message as RawVmAddPackageMessage;
        if (!current?.creator) {
          return true;
        }
        return current.creator !== caller;
      }
      case MsgEndpoint.MSG_RUN: {
        const current = message as RawVmRunMessage;
        if (!current?.caller) {
          return true;
        }
        return current.caller !== caller;
      }
      default: {
        return true;
      }
    }
  });
  return !invalidedMatch;
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
  const { currentAccount, currentAddress } = useCurrentAccount();
  const { navigate } = useAppNavigate();
  const [broadcastTransactionState, setBroadcastTransactionState] =
    useState<BroadcastTransactionState>('UPLOAD_TRANSACTION');
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
    if (!currentAddress) {
      return false;
    }
    try {
      const rawTx = JSON.parse(text) as RawTx;
      if (!matchTransactionCaller(rawTx, currentAddress)) {
        return false;
      }
      const transaction = strToSignedTx(text);
      setTransaction(transaction);
      setRawTransaction(rawTx);
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
      .sendTransaction(wallet, currentAccount, transaction, false)
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
