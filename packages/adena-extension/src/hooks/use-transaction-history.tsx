import { GnoClientState, WalletState } from "@states/index"
import { useRecoilState } from "recoil";
import { HistoryItem, HistoryItemType } from "gno-client/src/api/response";
import { dateToLocal } from "@common/utils/client-utils";
import { useAdenaContext } from "./use-context";

export const useTransactionHistory = (): [
    getHistory: () => Promise<{ [key in string]: Array<HistoryItem> }>,
    updateLastTransactionHistory: () => Promise<boolean>,
    updateNextTransactionHistory: () => Promise<boolean>
] => {
    const { accountService } = useAdenaContext();
    const [gnoClient] = useRecoilState(GnoClientState.current);
    const [transactionHistory, setTransactionHistory] = useRecoilState(WalletState.transactionHistory);

    const getHistory = async () => {
        const address = await accountService.loadCurrentAccountAddress();
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
        const address = await accountService.loadCurrentAccountAddress();
        if (address && !transactionHistory.isFinish) {
            if (address === transactionHistory.address) {
                return await fetchTransactionHistory(transactionHistory.currentPage + 1);
            }
        }
        return false;
    }

    const fetchTransactionHistory = async (page: number) => {
        const address = await accountService.loadCurrentAccountAddress();
        if (gnoClient && address) {
            const currentPage = page ?? 0;
            try {
                const response = await gnoClient.getTransactionHistory(address, currentPage * 20);
                const lastPage = currentPage > transactionHistory.currentPage ? currentPage : transactionHistory.currentPage;
                const newItems = response.txs.map((tx: HistoryItemType) => {
                    return {
                        ...tx,
                        date: dateToLocal(tx.date).value
                    }
                });
                const newItemHashes = response.txs.map((item: HistoryItem) => item.hash);
                const items = transactionHistory.items.filter(item => !newItemHashes.includes(item.hash));
                const isFinish = transactionHistory.isFinish ? true : !response.next;
                const changedHistory = {
                    init: true,
                    address,
                    currentPage: lastPage,
                    isFinish,
                    items: [...items, ...newItems].sort(compareTransactionItem)
                };
                setTransactionHistory(changedHistory);
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