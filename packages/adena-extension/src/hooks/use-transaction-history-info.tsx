import theme from "@styles/theme";
import { amountSetSymbol, formatAddress, fullDateFormat, minFractionDigits } from "@common/utils/client-utils";
import { useTokenMetainfo } from "./use-token-metainfo";
import IconAddPkg from '../assets/addpkg.svg';
import IconContract from '../assets/contract.svg';
import { GnoClientResnpose } from "gno-client/src/api";
import { useGnoClient } from "./use-gno-client";
import { useTokenBalance } from "./use-token-balance";

export interface TransactionInfo {
  icon: any;
  title: string;
  titleDescription: string;
  amount: string;
  msgNum: number;
}

export interface TransactionDetailInfo {
  icon: any;
  main: string;
  date: string;
  type: string;
  status: string;
  msgNum: number;
  transfer?: {
    type: string;
    address: string;
  };
  networkFee: string;
}

export const useTransactionHistoryInfo = (): [{
  getTransactionInfo: (transactionItem: GnoClientResnpose.HistoryItemType) => TransactionInfo,
  getTransactionDetailInfo: (transactionItem: GnoClientResnpose.HistoryItemType) => TransactionDetailInfo,
  getStatusColor: (transactionItem: GnoClientResnpose.HistoryItemType) => string,
  getAmountValue: (transactionItem: GnoClientResnpose.HistoryItemType) => string,
  getAmountFullValue: (transactionItem: GnoClientResnpose.HistoryItemType) => string,
  getNetworkFee: (transactionItem: GnoClientResnpose.HistoryItemType) => string,
  getTransferInfo: (transactionItem: GnoClientResnpose.HistoryItemType) => { type: string, address: string },
}] => {

  const { tokenBalances } = useTokenBalance();
  const { convertDenom, getTokenImage } = useTokenMetainfo();

  const isBankMsgSend = (transactionItem: GnoClientResnpose.HistoryItemType): transactionItem is GnoClientResnpose.HistoryItemBankMsgSend => {
    return transactionItem.type === '/bank.MsgSend';
  }
  const isVmMCall = (transactionItem: GnoClientResnpose.HistoryItemType): transactionItem is GnoClientResnpose.HistoryItemVmMCall => {
    return transactionItem.type === '/vm.m_call';
  }
  const isVmMAddPkg = (transactionItem: GnoClientResnpose.HistoryItemType): transactionItem is GnoClientResnpose.HistoryItemVmMAddPkg => {
    return transactionItem.type === '/vm.m_addpkg';
  }

  const getTransactionInfo = (transactionItem: GnoClientResnpose.HistoryItemType): TransactionInfo => {
    if (isBankMsgSend(transactionItem)) {
      return mappedBankMsgSend(transactionItem);
    }
    if (isVmMAddPkg(transactionItem)) {
      return mappedVMAddPkg(transactionItem);
    }
    if (isVmMCall(transactionItem)) {
      return mappedVMCall(transactionItem);
    }
    return mappedCommon(transactionItem);
  }

  const getTransactionDetailInfo = (transactionItem: GnoClientResnpose.HistoryItemType): TransactionDetailInfo => {
    if (isBankMsgSend(transactionItem)) {
      return mappedBankMsgSendDetail(transactionItem);
    }
    if (isVmMAddPkg(transactionItem)) {
      return mappedVMAddPkgDetail(transactionItem);
    }
    if (isVmMCall(transactionItem)) {
      return mappedVMCallDetail(transactionItem);
    }
    return mappedCommonDetail(transactionItem);
  }

  const mappedCommon = (transactionItem: GnoClientResnpose.HistoryItemType): TransactionInfo => {
    const func = transactionItem.func ?? '';
    const icon = IconContract;
    const title = func;
    const titleDescription = '';
    const amount = getAmountValue(transactionItem);
    const msgNum = 1;
    return {
      icon,
      title: title ?? '',
      titleDescription,
      amount,
      msgNum
    };
  }

  const mappedBankMsgSend = (transactionItem: GnoClientResnpose.HistoryItemBankMsgSend): TransactionInfo => {
    const func = getFunctionName(transactionItem);
    const icon = transactionItem.msgNum > 1 ? IconContract : getTokenImage(transactionItem.transfer?.denom ?? tokenBalances[0]?.denom);
    const title = (['Fail'].includes(func)) ? 'Send' : func;
    const titleDescription = getTransferDescription(transactionItem);
    const amount = getAmountValue(transactionItem);
    const msgNum = transactionItem.msgNum;
    return {
      icon,
      title: title ?? '',
      titleDescription,
      amount,
      msgNum
    };
  }

  const mappedVMAddPkg = (transactionItem: GnoClientResnpose.HistoryItemVmMAddPkg): TransactionInfo => {
    const icon = IconAddPkg;
    const title = "AddPkg";
    const titleDescription = '';
    const amount = getAmountValue(transactionItem);
    const msgNum = transactionItem.msgNum;
    return {
      icon,
      title,
      titleDescription,
      amount,
      msgNum
    };
  }

  const mappedVMCall = (transactionItem: GnoClientResnpose.HistoryItemVmMCall): TransactionInfo => {
    const func = transactionItem.func ?? 'Contract';
    const icon = IconContract;
    const title = func;
    const titleDescription = '';
    const amount = getAmountValue(transactionItem);
    const msgNum = transactionItem.msgNum;
    return {
      icon,
      title,
      titleDescription,
      amount,
      msgNum
    };
  }

  const mappedCommonDetail = (transactionItem: GnoClientResnpose.HistoryItemType): TransactionDetailInfo => {
    const icon = IconContract;
    const main = transactionItem.func ?? '';
    const date = fullDateFormat(transactionItem.date);
    const type = "Contract Interaction";
    const status = transactionItem.result.status;
    const networkFee = getNetworkFee(transactionItem);
    const msgNum = 1;
    return {
      icon,
      main,
      date,
      type,
      status,
      networkFee,
      msgNum
    };
  }

  const mappedBankMsgSendDetail = (transactionItem: GnoClientResnpose.HistoryItemBankMsgSend): TransactionDetailInfo => {
    const icon = transactionItem.msgNum > 1 ? IconContract : getTokenImage(transactionItem.transfer?.denom ?? tokenBalances[0]?.denom);
    const main = getAmountFullValue(transactionItem);
    const date = fullDateFormat(transactionItem.date);
    const type = getFunctionName(transactionItem);
    const status = transactionItem.result.status;
    const transfer = getTransferInfo(transactionItem);
    const networkFee = getNetworkFee(transactionItem);
    const msgNum = transactionItem.msgNum;
    return {
      icon,
      main,
      date,
      type,
      status,
      transfer,
      networkFee,
      msgNum
    };
  }

  const mappedVMAddPkgDetail = (transactionItem: GnoClientResnpose.HistoryItemVmMAddPkg): TransactionDetailInfo => {
    const icon = IconAddPkg;
    const main = 'AddPkg';
    const date = fullDateFormat(transactionItem.date);
    const type = "Add Package";
    const status = transactionItem.result.status;
    const networkFee = getNetworkFee(transactionItem);
    const msgNum = transactionItem.msgNum;
    return {
      icon,
      main,
      date,
      type,
      status,
      networkFee,
      msgNum
    };
  }

  const mappedVMCallDetail = (transactionItem: GnoClientResnpose.HistoryItemVmMCall): TransactionDetailInfo => {
    const icon = IconContract;
    const main = transactionItem.func ?? '';
    const date = fullDateFormat(transactionItem.date);
    const type = "Contract Interaction";
    const status = transactionItem.result.status;
    const networkFee = getNetworkFee(transactionItem);
    const msgNum = transactionItem.msgNum;
    return {
      icon,
      main,
      date,
      type,
      status,
      networkFee,
      msgNum
    };
  }

  const getStatusColor = (transactionItem: GnoClientResnpose.HistoryItemType) => {
    const { func, result } = transactionItem;
    if (func === 'Receive' && result.status === 'Success') {
      return theme.color.green[2];
    } else if (result.status === 'Success') {
      return theme.color.neutral[0];
    } else if (result.status === 'Fail') {
      return theme.color.neutral[9];
    }
    return theme.color.neutral[9];
  }

  const getFunctionName = (transactionItem: GnoClientResnpose.HistoryItemType) => {
    if (isBankMsgSend(transactionItem)) {
      if (transactionItem?.func === 'Fail') {
        return 'Send';
      }
    }
    return transactionItem?.func ?? '';
  }

  const getTransferDescription = (transactionItem: GnoClientResnpose.HistoryItemBankMsgSend) => {
    if (transactionItem.msgNum > 1) {
      return '';
    }
    const functionName = getFunctionName(transactionItem);
    if (!functionName) {
      return '';
    }
    switch (functionName) {
      case 'Send':
        return `To: ${formatAddress(transactionItem.to ?? '', 4)}`;
      case 'Receive':
        return `From: ${formatAddress(transactionItem.from ?? '', 4)}`
      default:
        return '';
    }
  }

  const getAmountValue = (transactionItem: GnoClientResnpose.HistoryItemType) => {
    if (transactionItem.msgNum > 1) {
      return 'More';
    }
    try {
      const { amount, denom } = transactionItem.transfer;
      let value = amount ?? '0';
      let currentDenom = denom ? denom.toUpperCase() : tokenBalances[0]?.denom.toUpperCase();
      const result = convertDenom(value, currentDenom, 'COMMON');
      value = result.value;
      currentDenom = result.denom;
      return `${amountSetSymbol(value.toString())} ${currentDenom}`;
    } catch (e) {
      return '';
    }
  }

  const getAmountFullValue = (transactionItem: GnoClientResnpose.HistoryItemType) => {
    if (transactionItem.msgNum > 1) {
      return transactionItem.func ?? 'More';
    }
    try {
      const { amount, denom } = transactionItem.transfer;
      let value = amount ?? '0';
      let currentDenom = denom ? denom.toUpperCase() : tokenBalances[0]?.denom.toUpperCase();
      const result = convertDenom(value, currentDenom, 'COMMON');
      value = result.value;
      currentDenom = result.denom;
      return `${minFractionDigits(value.toString(), 6)} ${currentDenom}`;
    } catch (e) {
      return '';
    }
  }

  const getNetworkFee = (transactionItem: GnoClientResnpose.HistoryItemType) => {
    const feeAmount = transactionItem.fee.amount ?? '0';
    const result = convertDenom(feeAmount, transactionItem.fee.denom, 'COMMON');
    return `${minFractionDigits(result.value.toString(), 6)} ${result.denom}`;
  }

  const getTransferInfo = (transactionItem: GnoClientResnpose.HistoryItemType) => {
    if (!isBankMsgSend(transactionItem)) {
      return { type: '', address: '' };
    }
    const isSend = getFunctionName(transactionItem) === 'Send';
    return {
      type: isSend ? "To" : "From",
      address: isSend ?
        formatAddress(transactionItem.to ?? '', 4) :
        formatAddress(transactionItem.from ?? '', 4)
    }
  }

  return [{
    getTransactionInfo,
    getTransactionDetailInfo,
    getStatusColor,
    getAmountValue,
    getAmountFullValue,
    getNetworkFee,
    getTransferInfo
  }];
}