import React, { useEffect, useState } from "react";
import { useTransactionHistory } from "@hooks/use-transaction-history";
import { useRecoilState, useResetRecoilState } from "recoil";
import { CommonState, ExploreState, GnoClientState, WalletState } from "@states/index";
import { createImageDataBySvg } from "@common/utils/client-utils";
import { AdenaStorage } from "@common/storage";
import { useLocation } from "react-router-dom";
import { GnoClient } from "gno-client";
import { useAdenaContext } from "@hooks/use-context";

interface Props {
    children?: React.ReactNode;
}

export const Background = ({ children }: Props) => {
    const { accountService, chainService, tokenService } = useAdenaContext();
    const location = useLocation();
    const [currentAccountAddress, setCurrentAccountAddress] = useState<string>('');
    const [gnoClient] = useRecoilState(GnoClientState.current);
    const [transactionHistory] = useRecoilState(WalletState.transactionHistory)
    const [, updateLastTransactionHistory] = useTransactionHistory();
    const [exploreSites, setExploreSites] = useRecoilState(ExploreState.sites);
    const [, setFailedNetwork] = useRecoilState(CommonState.failedNetwork);

    const clearTransactionHistory = useResetRecoilState(WalletState.transactionHistory);
    const clearCurrentBalance = useResetRecoilState(WalletState.currentBalance);
    const clearHistoryPosition = useResetRecoilState(CommonState.historyPosition);

    useEffect(() => {
        if (gnoClient) {
            checkNetwork(gnoClient);
        }
    }, [gnoClient?.chainId, location]);

    /**
     * History Data Interval Fetch
     */
    useEffect(() => {
        accountService.getCurrentAccount().then(currentAccount => {
            if (gnoClient?.chainId && currentAccount) {
                const historyFetchTimer = setInterval(() => {
                    updateLastTransactionHistory();
                }, 5000);
                return () => { clearInterval(historyFetchTimer) }
            }
        });
    }, [gnoClient?.chainId, transactionHistory.currentPage]);


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
