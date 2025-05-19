import { dateToLocal, formatAddress, getDateText } from '@common/utils/client-utils';
import { TransactionInfo, TransactionWithPageInfo } from '@types';
import {
  TransactionHistoryItem,
  TransactionHistoryResponse,
} from '../response/transaction-history-response';

function isHistoryItemGRC20Transfer(
  historyItem: TransactionHistoryItem,
): historyItem is TransactionHistoryItem {
  return historyItem.isGRC20Transfer;
}

function isHistoryItemBankMsgSend(
  historyItem: TransactionHistoryItem,
): historyItem is TransactionHistoryItem {
  if (historyItem.messageCount !== 1) {
    return false;
  }

  return historyItem.func?.[0].messageType === '/bank.MsgSend';
}

function isHistoryItemVmMCall(
  historyItem: TransactionHistoryItem,
): historyItem is TransactionHistoryItem {
  if (historyItem.messageCount !== 1) {
    return false;
  }

  return historyItem.func?.[0].messageType === '/vm.m_call';
}

function isHistoryItemVmMAddPkg(
  historyItem: TransactionHistoryItem,
): historyItem is TransactionHistoryItem {
  if (historyItem.messageCount !== 1) {
    return false;
  }

  return historyItem.func?.[0].messageType === '/vm.m_addpkg';
}

export class TransactionHistoryMapper {
  public static queryToDisplay(
    transactions: TransactionInfo[],
  ): { title: string; transactions: TransactionInfo[] }[] {
    const initValue: { title: string; transactions: TransactionInfo[] }[] = [];

    return transactions.reduce(
      (accum: { title: string; transactions: TransactionInfo[] }[], current) => {
        const title = getDateText(current.date.slice(0, 10));
        const accumIndex = accum.findIndex((item) => item.title === title);
        if (accumIndex < 0) {
          accum.push({
            title,
            transactions: [current],
          });
        } else {
          accum[accumIndex].transactions.push(current);
        }
        return accum;
      },
      initValue,
    );
  }

  public static fromResponse(
    response: TransactionHistoryResponse | null,
    callerAddress: string,
  ): TransactionWithPageInfo {
    if (!response) {
      return {
        page: {
          hasNext: false,
          cursor: null,
        },
        transactions: [],
      };
    }

    const { page, items } = response;
    const mappedTxs = items.map((item) =>
      TransactionHistoryMapper.mappedHistoryItem(item, callerAddress),
    );
    return {
      page,
      transactions: mappedTxs,
    };
  }

  private static mappedHistoryItem(
    historyItem: TransactionHistoryItem,
    callerAddress: string,
  ): TransactionInfo {
    if (historyItem.messageCount > 1) {
      return TransactionHistoryMapper.mappedHistoryItemMultiCall(historyItem, callerAddress);
    }

    if (isHistoryItemBankMsgSend(historyItem)) {
      return TransactionHistoryMapper.mappedBankMsgSend(historyItem, callerAddress);
    }

    if (isHistoryItemGRC20Transfer(historyItem)) {
      return TransactionHistoryMapper.mappedBankMsgSend(historyItem, callerAddress);
    }

    if (isHistoryItemVmMCall(historyItem)) {
      return TransactionHistoryMapper.mappedHistoryItemVmMCall(historyItem, callerAddress);
    }

    if (isHistoryItemVmMAddPkg(historyItem)) {
      return TransactionHistoryMapper.mappedHistoryItemVmMAddPkg(historyItem);
    }

    return TransactionHistoryMapper.mappedHistoryItemDefault(historyItem);
  }

  private static mappedHistoryItemMultiCall(
    historyItem: TransactionHistoryItem,
    callerAddress: string,
  ): TransactionInfo {
    const isReceived = historyItem.toAddress === callerAddress;

    let valueType: 'BLUR' | 'DEFAULT' | 'ACTIVE' = 'BLUR';

    if (historyItem.successYn) {
      valueType = isReceived ? 'ACTIVE' : 'DEFAULT';
    }

    const message = historyItem.func?.[0];

    return {
      hash: historyItem.txHash,
      logo: '',
      type: 'MULTI_CONTRACT_CALL',
      status: historyItem.successYn ? 'SUCCESS' : 'FAIL',
      typeName: message.funcType,
      title: message.funcType,
      extraInfo: `+${historyItem.messageCount - 1}`,
      amount: {
        value: '',
        denom: '',
      },
      to:
        !isReceived && historyItem.toAddress
          ? `${formatAddress(historyItem.toAddress, 4)}`
          : undefined,
      from:
        isReceived && historyItem.fromAddress
          ? `${formatAddress(historyItem.fromAddress, 4)}`
          : undefined,
      originTo: historyItem.toAddress || '',
      originFrom: historyItem.fromAddress || '',
      valueType,
      date: dateToLocal(historyItem.timestamp).value,
      networkFee: {
        value: `${historyItem.fee.value || '0'}`,
        denom: `${historyItem.fee.denom}`,
      },
    };
  }

  private static mappedBankMsgSend(
    historyItem: TransactionHistoryItem,
    callerAddress: string,
  ): TransactionInfo {
    const isReceived = historyItem.toAddress === callerAddress;
    const functionName = isReceived ? 'Receive' : 'Send';

    let valueType: 'BLUR' | 'DEFAULT' | 'ACTIVE' = 'BLUR';

    if (historyItem.successYn) {
      valueType = isReceived ? 'ACTIVE' : 'DEFAULT';
    }

    const description =
      historyItem.func[0].messageType === '/bank.MsgSend'
        ? `To: ${formatAddress(historyItem.toAddress, 4)}`
        : `From: ${formatAddress(historyItem.fromAddress, 4)}`;

    const amount = isReceived ? historyItem.amountIn : historyItem.amountOut;

    return {
      hash: historyItem.txHash,
      logo: '',
      type: 'TRANSFER',
      typeName: functionName,
      status: historyItem.successYn ? 'SUCCESS' : 'FAIL',
      title: functionName,
      description,
      amount: {
        value: `${amount.value || '0'}`,
        denom: amount.denom || 'ugnot',
      },
      to:
        !isReceived && historyItem.toAddress
          ? `${formatAddress(historyItem.toAddress, 4)}`
          : undefined,
      from:
        isReceived && historyItem.fromAddress
          ? `${formatAddress(historyItem.fromAddress, 4)}`
          : undefined,
      originTo: historyItem.toAddress || '',
      originFrom: historyItem.fromAddress || '',
      valueType,
      date: dateToLocal(historyItem.timestamp).value,
      networkFee: {
        value: `${historyItem.fee.value || '0'}`,
        denom: `${historyItem.fee.denom}`,
      },
    };
  }

  private static mappedHistoryItemVmMCall(
    historyItem: TransactionHistoryItem,
    callerAddress: string,
  ): TransactionInfo {
    const isTransfer = historyItem.isGRC20Transfer;
    const isReceived = historyItem.toAddress === callerAddress;
    const functionName = isTransfer
      ? isReceived
        ? 'Receive'
        : 'Send'
      : historyItem.func?.[0]?.funcType || '';

    let valueType: 'BLUR' | 'DEFAULT' | 'ACTIVE' = 'BLUR';

    if (historyItem.successYn) {
      valueType = 'DEFAULT';

      if (isTransfer) {
        valueType = isReceived ? 'ACTIVE' : 'DEFAULT';
      }
    }

    const transactionType = isTransfer ? 'TRANSFER' : 'CONTRACT_CALL';

    const amount = isTransfer && isReceived ? historyItem.amountIn : historyItem.amountOut;

    return {
      hash: historyItem.txHash,
      logo: '',
      type: transactionType,
      typeName: 'Contract Interaction',
      status: historyItem.successYn ? 'SUCCESS' : 'FAIL',
      title: functionName,
      amount: {
        value: `${amount.value || '0'}`,
        denom: amount.denom || '',
      },
      valueType,
      description: isTransfer
        ? isReceived
          ? `From: ${formatAddress(historyItem.fromAddress, 4)}`
          : `To: ${formatAddress(historyItem.toAddress, 4)}`
        : '',
      to: isTransfer && !isReceived ? `${formatAddress(historyItem.toAddress, 4)}` : undefined,
      from: isTransfer && isReceived ? `${formatAddress(historyItem.fromAddress, 4)}` : undefined,
      originTo: historyItem.toAddress || '',
      originFrom: historyItem.fromAddress || '',
      date: dateToLocal(historyItem.timestamp).value,
      networkFee: {
        value: `${historyItem.fee.value || '0'}`,
        denom: `${historyItem.fee.denom}`,
      },
    };
  }

  private static mappedHistoryItemVmMAddPkg(historyItem: TransactionHistoryItem): TransactionInfo {
    let valueType: 'BLUR' | 'DEFAULT' | 'ACTIVE' = 'BLUR';

    if (historyItem.successYn) {
      valueType = 'DEFAULT';
    }
    return {
      hash: historyItem.txHash,
      logo: '',
      type: 'ADD_PACKAGE',
      status: historyItem.successYn ? 'SUCCESS' : 'FAIL',
      typeName: 'Add Package',
      title: 'AddPkg',
      amount: {
        value: `${historyItem.amountIn.value || '0'}`,
        denom: historyItem.amountIn.denom || 'ugnot',
      },
      valueType,
      date: dateToLocal(historyItem.timestamp).value,
      networkFee: {
        value: `${historyItem.fee.value || '0'}`,
        denom: `${historyItem.fee.denom}`,
      },
    };
  }

  private static mappedHistoryItemDefault(historyItem: TransactionHistoryItem): TransactionInfo {
    const valueType = historyItem.successYn ? 'DEFAULT' : 'BLUR';
    return {
      hash: historyItem.txHash,
      logo: '',
      type: 'CONTRACT_CALL',
      typeName: 'Contract Interaction',
      status: historyItem.successYn ? 'SUCCESS' : 'FAIL',
      title: historyItem.func[0].funcType,
      amount: {
        value: `${historyItem.amountIn.value || '0'}`,
        denom: historyItem.amountIn.denom || 'ugnot',
      },
      valueType,
      date: dateToLocal(historyItem.timestamp).value,
      networkFee: {
        value: `${historyItem.fee.value || '0'}`,
        denom: `${historyItem.fee.denom}`,
      },
    };
  }
}
