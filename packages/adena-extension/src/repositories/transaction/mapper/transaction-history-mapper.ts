import { dateToLocal, formatAddress, getDateText } from '@common/utils/client-utils';
import {
  HistoryItem,
  HistoryItemBankMsgSend,
  HistoryItemVmMAddPkg,
  HistoryItemVmMCall,
  TransactionHistoryResponse,
} from '../response/transaction-history-response';

interface TransactionInfo {
  hash: string;
  logo: string;
  type: 'TRANSFER' | 'ADD_PACKAGE' | 'CONTRACT_CALL' | 'MULTI_CONTRACT_CALL';
  typeName?: string;
  status: 'SUCCESS' | 'FAIL';
  title: string;
  description?: string;
  extraInfo?: string;
  amount: {
    value: string;
    denom: string;
  };
  valueType: 'DEFAULT' | 'ACTIVE' | 'BLUR';
  date: string;
  from?: string;
  to?: string;
  networkFee?: {
    value: string;
    denom: string;
  };
}

function isHistoryItemGRC20Transfer(
  historyItem: HistoryItem,
): historyItem is HistoryItemBankMsgSend {
  return historyItem.type === '/vm.m_call' && historyItem.func === 'Send';
}

function isHistoryItemBankMsgSend(historyItem: HistoryItem): historyItem is HistoryItemBankMsgSend {
  return historyItem.type === '/bank.MsgSend';
}

function isHistoryItemVmMCall(historyItem: HistoryItem): historyItem is HistoryItemVmMCall {
  return historyItem.type === '/vm.m_call';
}

function isHistoryItemVmMAddPkg(historyItem: HistoryItem): historyItem is HistoryItemVmMAddPkg {
  return historyItem.type === '/vm.m_addpkg';
}

export class TransactionHistoryMapper {
  public static queryToDisplay(
    datas: {
      next: boolean;
      hits: number;
      txs: TransactionInfo[];
    }[],
  ) {
    const transactions =
      datas.flatMap((history) => {
        if (Array.isArray(history)) {
          return [];
        }
        return history.txs;
      }) ?? [];
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

  public static fromResposne(response: TransactionHistoryResponse) {
    const { hits, next, txs } = response;
    const mappedTxs = txs
      .sort(TransactionHistoryMapper.compareTransactionItem)
      .map(TransactionHistoryMapper.mappedHistoryItem);
    return {
      hits,
      next,
      txs: mappedTxs,
    };
  }

  private static mappedHistoryItem(historyItem: HistoryItem): TransactionInfo {
    if (historyItem.msg_num > 1) {
      return TransactionHistoryMapper.mappedHistoryItemMutiCall(historyItem);
    }
    if (isHistoryItemGRC20Transfer(historyItem)) {
      return TransactionHistoryMapper.mappedBankMsgSend(historyItem);
    }
    if (isHistoryItemBankMsgSend(historyItem)) {
      return TransactionHistoryMapper.mappedBankMsgSend(historyItem);
    }
    if (isHistoryItemVmMCall(historyItem)) {
      return TransactionHistoryMapper.mappedHistoryItemVmMCall(historyItem);
    }
    if (isHistoryItemVmMAddPkg(historyItem)) {
      return TransactionHistoryMapper.mappedHistoryItemVmMAddPkg(historyItem);
    }
    return TransactionHistoryMapper.mappedHistoryItemDefault(historyItem);
  }

  private static mappedHistoryItemMutiCall(historyItem: HistoryItem): TransactionInfo {
    const { hash, result, func, msg_num, date, fee } = historyItem;
    const valueType = result.status === 'Fail' ? 'BLUR' : func === 'Receive' ? 'ACTIVE' : 'DEFAULT';
    return {
      hash,
      logo: '',
      type: 'MULTI_CONTRACT_CALL',
      typeName: func ?? '',
      status: result.status === 'Success' ? 'SUCCESS' : 'FAIL',
      title: func ?? '',
      extraInfo: `+${msg_num - 1}`,
      amount: {
        value: '',
        denom: '',
      },
      valueType,
      date: dateToLocal(date).value,
      networkFee: {
        value: `${fee.amount}`,
        denom: `${fee.denom}`,
      },
    };
  }

  private static mappedBankMsgSend(historyItem: HistoryItemBankMsgSend): TransactionInfo {
    const { hash, result, func, to, from, transfer, date, fee } = historyItem;
    const valueType = result.status === 'Fail' ? 'BLUR' : func === 'Receive' ? 'ACTIVE' : 'DEFAULT';
    const description =
      func === 'Send' ? `To: ${formatAddress(to, 4)}` : `From: ${formatAddress(from, 4)}`;
    return {
      hash,
      logo: '',
      type: 'TRANSFER',
      typeName: func || '',
      status: result.status === 'Success' ? 'SUCCESS' : 'FAIL',
      title: func || '',
      description,
      amount: {
        value: `${transfer.amount}`,
        denom: transfer.denom || 'GNOT',
      },
      to: `${formatAddress(to, 4)}`,
      from: `${formatAddress(from, 4)}`,
      valueType,
      date: dateToLocal(date).value,
      networkFee: {
        value: `${fee.amount}`,
        denom: `${fee.denom}`,
      },
    };
  }

  private static mappedHistoryItemVmMCall(historyItem: HistoryItemVmMCall): TransactionInfo {
    const { hash, result, func, transfer, date, fee } = historyItem;
    const valueType = result.status === 'Fail' ? 'BLUR' : func === 'Receive' ? 'ACTIVE' : 'DEFAULT';
    return {
      hash,
      logo: '',
      type: 'CONTRACT_CALL',
      typeName: 'Contract Interaction',
      status: result.status === 'Success' ? 'SUCCESS' : 'FAIL',
      title: func ?? '',
      amount: {
        value: `${transfer.amount}`,
        denom: transfer.denom || 'GNOT',
      },
      valueType,
      date: dateToLocal(date).value,
      networkFee: {
        value: `${fee.amount}`,
        denom: `${fee.denom}`,
      },
    };
  }

  private static mappedHistoryItemVmMAddPkg(historyItem: HistoryItemVmMAddPkg): TransactionInfo {
    const { hash, result, func, transfer, date, fee } = historyItem;
    const valueType = result.status === 'Fail' ? 'BLUR' : func === 'Receive' ? 'ACTIVE' : 'DEFAULT';
    return {
      hash,
      logo: '',
      type: 'ADD_PACKAGE',
      typeName: 'Add Package',
      status: result.status === 'Success' ? 'SUCCESS' : 'FAIL',
      title: 'AddPkg',
      amount: {
        value: `${transfer.amount}`,
        denom: transfer.denom || 'GNOT',
      },
      valueType,
      date: dateToLocal(date).value,
      networkFee: {
        value: `${fee.amount}`,
        denom: `${fee.denom}`,
      },
    };
  }

  private static mappedHistoryItemDefault(historyItem: HistoryItem): TransactionInfo {
    const { hash, result, func, transfer, date, fee } = historyItem;
    const valueType = result.status === 'Fail' ? 'BLUR' : func === 'Receive' ? 'ACTIVE' : 'DEFAULT';
    return {
      hash,
      logo: '',
      type: 'CONTRACT_CALL',
      typeName: 'Contract Interaction',
      status: result.status === 'Success' ? 'SUCCESS' : 'FAIL',
      title: func ?? '',
      amount: {
        value: `${transfer.amount}`,
        denom: transfer.denom || 'GNOT',
      },
      valueType,
      date: dateToLocal(date).value,
      networkFee: {
        value: `${fee.amount}`,
        denom: `${fee.denom}`,
      },
    };
  }

  private static compareTransactionItem = (item1: HistoryItem, item2: HistoryItem) => {
    try {
      const date1 = new Date(item1.date);
      const date2 = new Date(item2.date);

      if (date1 > date2) {
        return -1;
      } else if (date1 === date2) {
        if (item1.hash > item2.hash) {
          return -1;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return 1;
  };
}
