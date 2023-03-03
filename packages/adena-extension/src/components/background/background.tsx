import React, { useEffect } from "react";
import { useTransactionHistory } from "@hooks/use-transaction-history";
import { useRecoilState, useResetRecoilState } from "recoil";
import { CommonState, ExploreState, GnoClientState, WalletState } from "@states/index";
import { createImageDataBySvg } from "@common/utils/client-utils";
import { useLocation } from "react-router-dom";
import { GnoClient } from "gno-client";
import { useAdenaContext } from "@hooks/use-context";
import { useWalletBalances } from "@hooks/use-wallet-balances";
import { useLoadAccounts } from "@hooks/use-load-accounts";

interface Props {
    children?: React.ReactNode;
}

export const Background = ({ children }: Props) => {
    const location = useLocation();
    const { tokenService } = useAdenaContext();
    const [gnoClient] = useRecoilState(GnoClientState.current);
    const [transactionHistory] = useRecoilState(WalletState.transactionHistory)
    const [, updateLastTransactionHistory] = useTransactionHistory();
    const [exploreSites, setExploreSites] = useRecoilState(ExploreState.sites);
    const [, setFailedNetwork] = useRecoilState(CommonState.failedNetwork);
    const [currentAccount] = useRecoilState(WalletState.currentAccount);
    const [currentBalance] = useRecoilState(WalletState.currentBalance);
    const [, updateBalances] = useWalletBalances(gnoClient);
    const [state, setState] = useRecoilState(WalletState.state);
    const [accounts] = useRecoilState(WalletState.accounts);
    const { updateAccountBalances } = useLoadAccounts();

    const clearTransactionHistory = useResetRecoilState(WalletState.transactionHistory);
    const clearCurrentBalance = useResetRecoilState(WalletState.currentBalance);
    const clearHistoryPosition = useResetRecoilState(CommonState.historyPosition);

    useEffect(() => {
        if (state === "LOADING" || !currentBalance) {
            if (!accounts || accounts.length === 0) {
                setState("NONE");
                return;
            }
            updateBalances();
        }
    }, [location]);

    useEffect(() => {
        if (gnoClient) {
            checkNetwork(gnoClient);
        }
    }, [gnoClient?.chainId, location]);

    useEffect(() => {
        if (!accounts || accounts.length === 0) {
            return;
        }
        updateBalances();
        updateAccountBalances();
    }, [accounts?.length, currentAccount?.getAddress(), gnoClient?.chainId]);

    useEffect(() => {
        if (!accounts || accounts.length === 0) {
            return;
        }
        const balancesFetchTimer = setInterval(() => {
            updateAccountBalances();
        }, 5000);
        return () => {
            clearInterval(balancesFetchTimer);
        }
    }, [gnoClient?.chainId, accounts?.length]);

    /**
     * History Data Interval Fetch
     */
    useEffect(() => {
        if (gnoClient?.chainId && currentAccount) {
            clearTransactionHistory();
            clearHistoryPosition();
        }
    }, [gnoClient?.chainId, currentAccount?.getAddress()]);

    useEffect(() => {
        if (gnoClient?.chainId && currentAccount) {
            const historyFetchTimer = setInterval(() => {
                updateLastTransactionHistory();
            }, 5000);
            return () => {
                clearInterval(historyFetchTimer);
            }
        }
    }, [gnoClient?.chainId, currentAccount?.getAddress(), transactionHistory.currentPage]);


    useEffect(() => {
        if (exploreSites.length === 0) {
            fetchAppInfos();
        }
    }, [exploreSites]);

    useEffect(() => {
        updateAppInfos();
    }, [exploreSites.length]);

    useEffect(() => {
        clearCurrentBalance();
        clearTransactionHistory();
        clearHistoryPosition();
    }, [gnoClient?.chainId]);

    const checkNetwork = async (gnoClient: InstanceType<typeof GnoClient>) => {
        let health = false;
        try {
            health = await gnoClient.isHealth();
        } catch (e) {
            console.log(e);
        }
        setFailedNetwork(!health);
    };

    const fetchAppInfos = async () => {
        try {
            const response = await tokenService.getAppInfos();
            const exploreSites = response
                .filter(site => site.display)
                .sort(site => site.order);
            setExploreSites([...exploreSites]);
        } catch (error) {
            console.error(error);
        }
    }

    const updateAppInfos = async () => {
        if (exploreSites.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const convertedSites: Array<any> = [];
            for (const exploreSite of exploreSites) {
                const logo = await createImageDataBySvg(exploreSite.logo);
                convertedSites.push({
                    ...exploreSite,
                    logo
                });
            }
            setExploreSites([...convertedSites]);
        }
    }

    return (
        <>
            {children}
        </>
    );
};
