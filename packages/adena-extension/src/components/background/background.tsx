import React, { useEffect, useState } from "react";
import { useTransactionHistory } from "@hooks/use-transaction-history";
import { useRecoilState, useResetRecoilState } from "recoil";
import { ExploreState, GnoClientState, WalletState } from "@states/index";
import { createImageDataBySvg } from "@common/utils/client-utils";
import { ResourceService } from "@services/index";
import { AdenaStorage } from "@common/storage";

interface Props {
    children?: React.ReactNode;
}

export const Background = ({ children }: Props) => {

    const [currentAccountAddress, setCurrentAccountAddress] = useState<string>('');
    const [gnoClient] = useRecoilState(GnoClientState.current);
    const [currentAccount] = useRecoilState(WalletState.currentAccount);
    const [transactionHistory] = useRecoilState(WalletState.transactionHistory)
    const [, updateLastTransactionHistory] = useTransactionHistory();
    const [exploreSites, setExploreSites] = useRecoilState(ExploreState.sites);

    const clearTransactionHistory = useResetRecoilState(WalletState.transactionHistory);
    const clearCurrentBalance = useResetRecoilState(WalletState.currentBalance);

    /**
     * History Data Interval Fetch
     */
    useEffect(() => {
        if (gnoClient?.chainId && currentAccount) {
            const historyFetchTimer = setInterval(() => {
                updateLastTransactionHistory();
            }, 5000);
            return () => { clearInterval(historyFetchTimer) }
        }
    }, [gnoClient?.chainId, currentAccount, transactionHistory.currentPage]);

    useEffect(() => {
        if (currentAccount === null) {
            return;
        }
        if (currentAccount.getAddress() === currentAccountAddress) {
            return;
        }

        AdenaStorage.local().get('CURRENT_ACCOUNT_ADDRESS').then(storedAccountAddress => {
            if (storedAccountAddress !== currentAccount.getAddress()) {
                setCurrentAccountAddress(currentAccount.getAddress());
            }
        });
    }, [currentAccount])

    useEffect(() => {
        if (exploreSites.length === 0) {
            fetchAppInfos();
        }
    }, [exploreSites])

    useEffect(() => {
        clearCurrentBalance();
        clearTransactionHistory();
    }, [currentAccount?.getAddress(), gnoClient?.chainId]);

    const fetchAppInfos = async () => {
        try {
            const response = await ResourceService.fetchAppInfos();
            const exploreSites = response
                .filter(site => site.display)
                .sort(site => site.order);
            const convertedSites: Array<any> = [];
            for (const exploreSite of exploreSites) {
                const logoData = await createImageDataBySvg(exploreSite.logo);
                convertedSites.push({
                    ...exploreSite,
                    logo: logoData ?? ''
                });
            }
            setExploreSites([...convertedSites]);
        } catch (error) {
            console.error(error);
        }
    }

    return (
        <>
            {children}
        </>
    );
};
