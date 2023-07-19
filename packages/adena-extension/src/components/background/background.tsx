import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useRecoilState } from "recoil";
import { useCurrentAccount } from "@hooks/use-current-account";
import { useNetwork } from "@hooks/use-network";
import { useTokenMetainfo } from "@hooks/use-token-metainfo";
import { useTokenBalance } from "@hooks/use-token-balance";
import { useWalletContext } from "@hooks/use-context";
import { useAccountName } from "@hooks/use-account-name";
import { CommonState } from "@states/index";
import useScrollHistory from "@hooks/use-scroll-history";
import { NetworkMetainfo } from "@states/network";
import { fetchHealth } from "@common/utils/client-utils";

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
    fetchHealth(currentNetwork.rpcUrl).then(({ url, healthy }) => {
      updateFailedNetwork(url, healthy);
    });
  }

  function updateFailedNetwork(url: string, healthy: boolean) {
    if (currentNetwork.rpcUrl !== url) {
      return;
    }
    setFailedNetwork({
      ...failedNetwork,
      [currentNetwork.id]: !healthy
    });
  }

  return (
    <div>
      {children}
    </div>
  );
};
