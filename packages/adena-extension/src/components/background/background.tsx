import React, { useEffect, useState } from "react";
import { useTransactionHistory } from "@hooks/use-transaction-history";
import { useRecoilState, useResetRecoilState } from "recoil";
import { GnoClientState, WalletState } from "@states/index";

interface Props {
    children?: React.ReactNode;
}

export const Background = ({ children }: Props) => {

    const [currentAccountAddress, setCurrentAccountAddress] = useState<string>('');
    const [gnoClient] = useRecoilState(GnoClientState.current);
    const [currentAccount] = useRecoilState(WalletState.currentAccount);
    const [transactionHistory] = useRecoilState(WalletState.transactionHistory)
    const [, updateLastTransactionHistory] = useTransactionHistory();

    const clearTransactionHistory = useResetRecoilState(WalletState.transactionHistory);

    /**
     * History Data Interval Fetch
     */
    useEffect(() => {
        if (gnoClient && currentAccount) {
            const historyFetchTimer = setInterval(() => {
                updateLastTransactionHistory();
            }, 5000);
            return () => { clearInterval(historyFetchTimer) }
        }
    }, [gnoClient, currentAccount, transactionHistory.currentPage]);

    useEffect(() => {
        if (currentAccount !== null) {
            if (currentAccount.getAddress() !== currentAccountAddress) {
                setCurrentAccountAddress(currentAccount.getAddress());
            }
        }
    }, [currentAccount])

    useEffect(() => {
        if (currentAccountAddress.length > 0) {
            clearTransactionHistory();
        }
    }, [currentAccountAddress])

    return (
        <>
            {children}
        </>
    );
};
