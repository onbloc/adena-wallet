import { GnoClientState, WalletState } from "@states/index"
import { useRecoilState } from "recoil";
import { HistoryItem } from "gno-client/src/api/response";

export const useTransactionHistory = (): [
    getHistory: () => { [key in string]: Array<HistoryItem> },
    updateLastTransactionHistory: () => Promise<boolean>,
    updateNextTransactionHistory: () => Promise<boolean>
] => {

    const [gnoClient] = useRecoilState(GnoClientState.current);
    const [currentAccount] = useRecoilState(WalletState.currentAccount);
    const [transactionHistory, setTransactionHistory] = useRecoilState(WalletState.transactionHistory);

    const getHistory = () => {
        if (transactionHistory.address === currentAccount?.getAddress()) {
            return formatTransactionHistory(transactionHistory.items);
        }
        return {};
    }

    const formatTransactionHistory = (history: Array<HistoryItem>) => {
        const initValue: { [key in string]: Array<HistoryItem> } = {};
        return history.reduce((accum: { [key in string]: Array<HistoryItem> }, current) => {
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
        if (currentAccount && !transactionHistory.isFinish) {
            if (currentAccount.getAddress() === transactionHistory.address) {
                return await fetchTransactionHistory(transactionHistory.currentPage + 1);
            }
        }
        return false;
    }

    const fetchTransactionHistory = async (page: number) => {
        if (gnoClient && currentAccount) {
            const currentPage = page ?? 0;
            const address = currentAccount.getAddress();
            try {
                const response = await gnoClient.getTransactionHistory(address, currentPage * 20);
                const lastPage = currentPage > transactionHistory.currentPage ? currentPage : transactionHistory.currentPage;
                const newItems = response.txs;
                const newItemHashes = response.txs.map((item: HistoryItem) => item.hash);
                const items = transactionHistory.items.filter(item => !newItemHashes.includes(item.hash));
                const isFinish = page === 0 ? transactionHistory.isFinish : !response.next;
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