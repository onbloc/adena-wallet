import React, { useEffect, useState } from "react";
import { useTransactionHistory } from "@hooks/use-transaction-history";
import { useQuery } from "@tanstack/react-query";
import { useRecoilState, useResetRecoilState } from "recoil";
import { WalletState } from "@states/index";
import { useGnoClient } from "@hooks/use-gno-client";

interface Props {
    children?: React.ReactNode;
}

export const Background = ({ children }: Props) => {

    const [, updateLastTransactionHistory] = useTransactionHistory();
    const [currentAccountAddress, setCurrentAccountAddress] = useState<string>('');
    const [currentAccount] = useRecoilState(WalletState.currentAccount);
    const [gnoClient, , updateNetworks] = useGnoClient();

    const clearTransactionHistory = useResetRecoilState(WalletState.transactionHistory);

    useQuery(['transactionHistory'], updateLastTransactionHistory, { refetchInterval: 5000 });

    useEffect(() => {
        if (!gnoClient) {
            updateNetworks();
        }
    }, [gnoClient])

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
