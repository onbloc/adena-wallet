import { HistoryItem } from "gno-client/src/api/response";
import theme from "@styles/theme";
import { amountSetSymbol, formatAddress, fullDateFormat, minFractionDigits } from "@common/utils/client-utils";
import { useTokenConfig } from "./use-token-config";
import { useWalletBalances } from "./use-wallet-balances";
import IconAddPkg from '../assets/addpkg.svg';
import IconContract from '../assets/contract.svg';

export interface TransactionInfo {
    icon: any;
    title: string;
    titleDescription: string;
    amount: string;
}

export interface TransactionDetailInfo {
    icon: any;
    main: string;
    date: string;
    type: string;
    status: string;
    transfer?: {
        type: string;
        address: string;
    };
    networkFee: string;
}

export const useTransactionHistoryInfo = (): [{
    getTransactionInfo: (transactionItem: HistoryItem) => TransactionInfo,
    getTransactionDetailInfo: (transactionItem: HistoryItem) => TransactionDetailInfo,
    getStatusColor: (transactionItem: HistoryItem) => string,
    getAmountValue: (transactionItem: HistoryItem) => string,
    getAmountFullValue: (transactionItem: HistoryItem) => string,
    getNetworkFee: (transactionItem: HistoryItem) => string,
    getTransferInfo: (transactionItem: HistoryItem) => { type: string, address: string },
}] => {

    const [balances] = useWalletBalances();
    const [, convertUnit, getTokenImage] = useTokenConfig();

    const getTransactionInfo = (transactionItem: HistoryItem): TransactionInfo => {
        switch (transactionItem.type) {
            case '/bank.MsgSend':
                return mappedBankMsgSend(transactionItem);
            case '/vm.m_addpkg':
                return mappedVMAddPkg(transactionItem);
            case '/vm.m_call':
                return mappedVMCall(transactionItem);
            default:
                break;
        }
        return mappedCommon(transactionItem);
    }

    const getTransactionDetailInfo = (transactionItem: HistoryItem): TransactionDetailInfo => {
        switch (transactionItem.type) {
            case '/bank.MsgSend':
                return mappedBankMsgSendDetail(transactionItem);
            case '/vm.m_addpkg':
                return mappedVMAddPkgDetail(transactionItem);
            case '/vm.m_call':
                return mappedVMCallDetail(transactionItem);
            default:
                break;
        }
        return mappedCommonDetail(transactionItem);
    }

    const mappedCommon = (transactionItem: HistoryItem): TransactionInfo => {
        console.log("COMMON?", transactionItem);
        const func = transactionItem.func ?? '';
        const icon = IconContract;
        const title = func;
        const titleDescription = '';
        const amount = getAmountValue(transactionItem);
        return {
            icon,
            title: title ?? '',
            titleDescription,
            amount
        };
    }

    const mappedBankMsgSend = (transactionItem: HistoryItem): TransactionInfo => {
        const func = getFunctionName(transactionItem);
        const icon = getTokenImage(transactionItem.send?.denom ?? balances[0].denom);
        const title = (['Failed'].includes(func)) ? 'Send' : func;
        const titleDescription = getTransferDescription(transactionItem);
        const amount = getAmountValue(transactionItem);
        return {
            icon,
            title: title ?? '',
            titleDescription,
            amount
        };
    }

    const mappedVMAddPkg = (transactionItem: HistoryItem): TransactionInfo => {
        const icon = IconAddPkg;
        const title = "AddPkg";
        const titleDescription = '';
        const amount = getAmountValue(transactionItem);
        return {
            icon,
            title,
            titleDescription,
            amount
        };
    }

    const mappedVMCall = (transactionItem: HistoryItem): TransactionInfo => {
        const func = transactionItem.func ?? 'Contract';
        const icon = IconContract;
        const title = func;
        const titleDescription = '';
        const amount = getAmountValue(transactionItem);
        return {
            icon,
            title,
            titleDescription,
            amount
        };
    }

    const mappedCommonDetail = (transactionItem: HistoryItem): TransactionDetailInfo => {
        console.log("COMMON?", transactionItem);
        const icon = IconContract;
        const main = transactionItem.func ?? '';
        const date = fullDateFormat(transactionItem.date);
        const type = "Contract Interaction";
        const status = transactionItem.result.status;
        const networkFee = getNetworkFee(transactionItem);
        return {
            icon,
            main,
            date,
            type,
            status,
            networkFee
        };
    }

    const mappedBankMsgSendDetail = (transactionItem: HistoryItem): TransactionDetailInfo => {
        const icon = getTokenImage(transactionItem.send?.denom ?? balances[0].denom);
        const main = getAmountFullValue(transactionItem);
        const date = fullDateFormat(transactionItem.date);
        const type = getFunctionName(transactionItem);
        const status = transactionItem.result.status;
        const transfer = getTransferInfo(transactionItem);
        const networkFee = getNetworkFee(transactionItem);
        return {
            icon,
            main,
            date,
            type,
            status,
            transfer,
            networkFee
        };
    }

    const mappedVMAddPkgDetail = (transactionItem: HistoryItem): TransactionDetailInfo => {
        const icon = IconAddPkg;
        const main = 'AddPkg';
        const date = fullDateFormat(transactionItem.date);
        const type = "Add Package";
        const status = transactionItem.result.status;
        const networkFee = getNetworkFee(transactionItem);
        return {
            icon,
            main,
            date,
            type,
            status,
            networkFee
        };
    }

    const mappedVMCallDetail = (transactionItem: HistoryItem): TransactionDetailInfo => {
        const icon = IconContract;
        const main = transactionItem.func ?? '';
        const date = fullDateFormat(transactionItem.date);
        const type = "Contract Interaction";
        const status = transactionItem.result.status;
        const networkFee = getNetworkFee(transactionItem);
        return {
            icon,
            main,
            date,
            type,
            status,
            networkFee
        };
    }

    const getStatusColor = (transactionItem: HistoryItem) => {
        const { func, result } = transactionItem;
        if (func === 'Receive' && result.status === 'Success') {
            return theme.color.green[2];
        } else if (result.status === 'Success') {
            return theme.color.neutral[0];
        } else if (result.status === 'Failed') {
            return theme.color.neutral[9];
        }
        return theme.color.neutral[9];
    }

    const getFunctionName = (transactionItem: HistoryItem) => {
        const { func, type } = transactionItem;
        if (type === '/bank.MsgSend') {
            if (func && ['Failed'].includes(func)) {
                return 'Send';
            }
        }
        return func ?? '';
    }

    const getTransferDescription = (transactionItem: HistoryItem) => {
        const functionName = getFunctionName(transactionItem);
        switch (functionName) {
            case 'Send':
                return `To: ${formatAddress(transactionItem.to ?? '', 4)}`;
            case 'Receive':
                return `From: ${formatAddress(transactionItem.from ?? '', 4)}`
            default:
                break;
        }
        return '';
    }

    const getAmountValue = (transactionItem: HistoryItem) => {
        try {
            let amount = 0;
            let denom = balances[0].denom.toUpperCase();
            if (transactionItem.send) {
                const result = convertUnit(transactionItem.send.value, transactionItem.send.denom, 'COMMON');
                amount = result.amount;
                denom = result.denom;
            }
            return `${amountSetSymbol(amount)} ${denom}`;
        } catch (e) {
            return '';
        }
    }

    const getAmountFullValue = (transactionItem: HistoryItem) => {
        let amount = 0;
        let denom = balances[0].denom.toUpperCase();
        if (transactionItem.send) {
            const result = convertUnit(transactionItem.send.value, transactionItem.send.denom, 'COMMON');
            amount = result.amount;
            denom = result.denom;
        }
        return `${minFractionDigits(amount, 6)} ${denom}`;
    }

    const getNetworkFee = (transactionItem: HistoryItem) => {
        const result = convertUnit(transactionItem.fee.value, transactionItem.fee.denom, 'COMMON');
        return `${minFractionDigits(result.amount, 6)} ${result.denom}`;
    }

    const getTransferInfo = (transactionItem: HistoryItem) => {
        if (transactionItem.type !== '/bank.MsgSend') {
            return { type: '', address: '' };
        }
        const isSend = getFunctionName(transactionItem) === 'Send';
        return {
            type: isSend ? "Send" : "From",
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