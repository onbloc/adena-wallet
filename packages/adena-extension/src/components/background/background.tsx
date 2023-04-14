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

type BackgroundProps = React.PropsWithChildren<unknown>;

export const Background: React.FC<BackgroundProps> = ({ children }) => {
  const location = useLocation();
  const { tokenService } = useAdenaContext();
  const [gnoClient] = useRecoilState(GnoClientState.current);
  const [transactionHistory] = useRecoilState(WalletState.transactionHistory)
  const [, updateLastTransactionHistory] = useTransactionHistory();
  const [exploreSites, setExploreSites] = useRecoilState(ExploreState.sites);
  const [, setFailedNetwork] = useRecoilState(CommonState.failedNetwork);
  const [, setFailedNetworkChainId] = useRecoilState(CommonState.failedNetworkChainId);
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
    updateAccountBalances();
    updateBalances();

    const balancesFetchTimer = setInterval(() => {
      updateBalances();
      updateAccountBalances();
    }, 10 * 1000);
    return () => {
      clearInterval(balancesFetchTimer);
    }
  }, [gnoClient?.chainId, accounts?.length, currentAccount?.getAddress('g')]);

  /**
   * History Data Interval Fetch
   */
  useEffect(() => {
    if (gnoClient?.chainId && currentAccount) {
      clearTransactionHistory();
      clearHistoryPosition();
    }
  }, [gnoClient?.chainId, currentAccount?.getAddress('g')]);

  useEffect(() => {
    if (gnoClient?.chainId && currentAccount) {
      const historyFetchTimer = setInterval(() => {
        updateLastTransactionHistory();
      }, 10 * 1000);

      return () => {
        clearInterval(historyFetchTimer);
      }
    }
  }, [gnoClient?.chainId, currentAccount?.getAddress('g'), transactionHistory.currentPage]);


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
    const chainId = gnoClient.chainId;
    let health = false;
    try {
      health = await gnoClient.isHealth();
    } catch (e) {
      console.log(e);
    }
    setFailedNetwork(!health);
    if (!health) {
      setFailedNetworkChainId(chainId);
    }
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
