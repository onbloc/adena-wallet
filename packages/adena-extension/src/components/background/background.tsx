import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useRecoilState } from "recoil";
import axios from "axios";
import fetchAdapter from "@vespaiach/axios-fetch-adapter";
import { useCurrentAccount } from "@hooks/use-current-account";
import { useNetwork } from "@hooks/use-network";
import { useTokenMetainfo } from "@hooks/use-token-metainfo";
import { useTokenBalance } from "@hooks/use-token-balance";
import { useWalletContext } from "@hooks/use-context";
import { useAccountName } from "@hooks/use-account-name";
import { CommonState } from "@states/index";
import useScrollHistory from "@hooks/use-scroll-history";
import { NetworkMetainfo } from "@states/network";

type BackgroundProps = React.PropsWithChildren<unknown>;

export const Background: React.FC<BackgroundProps> = ({ children }) => {
  const { wallet, walletStatus } = useWalletContext();
  const { initAccountNames } = useAccountName();
  const { currentAccount } = useCurrentAccount();
  const { currentNetwork } = useNetwork();
  const { tokenMetainfos, initTokenMetainfos } = useTokenMetainfo();
  const { updateTokenBalanceInfos } = useTokenBalance();
  const { pathname, key } = useLocation();
  const [failedNetwork, setFailedNetwork] = useRecoilState(CommonState.failedNetwork);
  const { scrollMove } = useScrollHistory();

  useEffect(() => {
    checkHealth(currentNetwork);
  }, [pathname, currentNetwork]);

  useEffect(() => {
    scrollMove();
  }, [key]);

  useEffect(() => {
    if (currentAccount && currentNetwork) {
      initTokenMetainfos();
    }
  }, [currentAccount, currentNetwork]);

  useEffect(() => {
    if (tokenMetainfos.length === 0) {
      return;
    }
    updateTokenBalanceInfos(tokenMetainfos);
  }, [tokenMetainfos]);

  useEffect(() => {
    initAccountNames(wallet?.accounts ?? [])
  }, [wallet?.accounts]);

  function checkHealth(currentNetwork: NetworkMetainfo) {
    if (!currentNetwork) {
      return;
    }
    if (['NONE', 'CREATE', 'LOGIN'].includes(walletStatus)) {
      return;
    }
    fetchHealth(currentNetwork);
  }

  async function fetchHealth(currentNetwork: NetworkMetainfo) {
    const healthy = await axios.get(currentNetwork.rpcUrl + '/health', { adapter: fetchAdapter })
      .then(response => response.status === 200)
      .catch(() => false);
    updateFailedNetwork(currentNetwork.id, !healthy);
  }

  function updateFailedNetwork(networkId: string, failed: boolean) {
    setFailedNetwork({
      ...failedNetwork,
      [networkId]: failed
    });
  }

  return (
    <div>
      {children}
    </div>
  );
};
