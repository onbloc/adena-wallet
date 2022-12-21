import React, { useEffect, useState } from "react";
import { useTransactionHistory } from "@hooks/use-transaction-history";
import { useRecoilState, useResetRecoilState } from "recoil";
import { GnoClientState, WalletState } from "@states/index";
import { LocalStorageValue } from "@common/values";

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
        if (currentAccount === null) {
            return;
        }
        if (currentAccount.getAddress() === currentAccountAddress) {
            return;
        }
        LocalStorageValue.get('CURRENT_ACCOUNT_ADDRESS').then(storedAccountAddress => {
            if (storedAccountAddress !== currentAccount.getAddress()) {
                setCurrentAccountAddress(currentAccount.getAddress());
            }
        });
    }, [currentAccount])

    useEffect(() => {
        clearTransactionHistory();
    }, [currentAccount?.getAddress()])

    return (
        <>
            {children}
        </>
    );
};
