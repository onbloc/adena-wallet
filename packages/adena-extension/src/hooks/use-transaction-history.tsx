import { WalletState } from "@states/index"
import { useRecoilState } from "recoil";
import { dateToLocal } from "@common/utils/client-utils";
import { useCurrentAccount } from "./use-current-account";
import { useAdenaContext } from "./use-context";
import { HistoryItem } from "@repositories/transaction/response/transaction-history-response";

export const useTransactionHistory = (): [
    getHistory: () => Promise<{ [key in string]: Array<HistoryItem> }>,
    updateLastTransactionHistory: () => Promise<boolean>,
    updateNextTransactionHistory: () => Promise<boolean>
] => {
    const { transactionHistoryService } = useAdenaContext();
    const { currentAccount } = useCurrentAccount();
    const [transactionHistory, setTransactionHistory] = useRecoilState(WalletState.transactionHistory);

    const getHistory = async () => {
        const address = currentAccount?.getAddress('g');
        if (transactionHistory.address === address) {
            return formatTransactionHistory(transactionHistory.items);
        }
        return {};
    }

    const formatTransactionHistory = (history: Array<HistoryItem>) => {
        const initValue: { [key in string]: Array<HistoryItem> } = {};
        return history.reduce((accum: { [key in string]: Array<HistoryItem> }, current) => {
            if (current.result.status === 'Fail' && current.func === 'Receive') {
                return accum;
            }
            const dateStr = current.date.slice(0, 10);
            if (!accum[dateStr]) {
                accum[dateStr] = [] as Array<HistoryItem>;
            }
            accum[dateStr].push(current);

            return accum;
        }, initValue);
    }

    const updateLastTransactionHistory = async () => {
        return await fetchTransactionHistory(0);
    }

    const updateNextTransactionHistory = async () => {
        const address = currentAccount?.getAddress('g');
        if (address && !transactionHistory.isFinish) {
            if (address === transactionHistory.address) {
                return await fetchTransactionHistory(transactionHistory.currentPage + 1);
            }
        }
        return false;
    }

    const fetchTransactionHistory = async (page: number) => {
        const address = currentAccount?.getAddress('g');
        if (address) {
            const currentPage = page ?? 0;
            try {
                const transactions = await transactionHistoryService.fetchGRC20TransactionHistory(address, currentPage * 20, 20);
                const lastPage = currentPage > transactionHistory.currentPage ? currentPage : transactionHistory.currentPage;
                const newItems: HistoryItem[] = transactions.map((tx: HistoryItem) => {
                    return {
                        ...tx,
                        date: dateToLocal(tx.date).value
                    }
                });
                const newItemHashes = transactions.map((item) => item.hash);
                const items = transactionHistory.items.filter(item => !newItemHashes.includes(item.hash));
                const isFinish = transactionHistory.isFinish ? true : !(transactions.length < 20);
                const changedHistory = {
                    init: true,
                    address,
                    currentPage: lastPage,
                    isFinish,
                    items: [...items, ...newItems].sort(compareTransactionItem)
                };
                const currentAddress = currentAccount?.getAddress('g');
                if (currentAddress === address) {
                    setTransactionHistory(changedHistory);
                }
                return true;
            } catch (e) {
                console.log(e);
            }

        }
        return false;
    }

    const compareTransactionItem = (item1: HistoryItem, item2: HistoryItem) => {
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
    }

    return [getHistory, updateLastTransactionHistory, updateNextTransactionHistory];
}