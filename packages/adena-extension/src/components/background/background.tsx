import { useCurrentAccount } from "@hooks/use-current-account";
import React, { useEffect } from "react";
import { useNetwork } from "@hooks/use-network";
import { useTokenMetainfo } from "@hooks/use-token-metainfo";
import { useTokenBalance } from "@hooks/use-token-balance";
import { useWalletContext } from "@hooks/use-context";
import { useAccountName } from "@hooks/use-account-name";
import { useLocation } from "react-router-dom";
import { useRecoilState } from "recoil";
import { CommonState } from "@states/index";
import { useGnoClient } from "@hooks/use-gno-client";

type BackgroundProps = React.PropsWithChildren<unknown>;

export const Background: React.FC<BackgroundProps> = ({ children }) => {
  const { wallet, walletStatus } = useWalletContext();
  const { initAccountNames } = useAccountName();
  const { currentAccount } = useCurrentAccount();
  const [gnoClient] = useGnoClient()
  const { currentNetwork } = useNetwork();
  const { tokenMetainfos, initTokenMetainfos } = useTokenMetainfo();
  const { updateTokenBalanceInfos } = useTokenBalance();
  const { pathname } = useLocation();
  const [failedNetwork, setFailedNetwork] = useRecoilState(CommonState.failedNetwork);

  useEffect(() => {
    checkHealth();
  }, [pathname, currentNetwork, walletStatus]);

  useEffect(() => {
    if (currentAccount && currentNetwork && failedNetwork[currentNetwork.networkId] === false) {
      initTokenMetainfos();
    }
  }, [currentAccount, currentNetwork, failedNetwork]);

  useEffect(() => {
    if (tokenMetainfos.length === 0) {
      return;
    }
    updateTokenBalanceInfos(tokenMetainfos);
  }, [tokenMetainfos]);

  useEffect(() => {
    initAccountNames(wallet?.accounts ?? [])
  }, [wallet?.accounts]);

  function checkHealth() {
    if (!gnoClient) {
      return;
    }
    if (['NONE', 'CREATE', 'LOGIN'].includes(walletStatus)) {
      return;
    }
    gnoClient.isHealth().then(isHelath => {
      setFailedNetwork({
        ...failedNetwork,
        [gnoClient.networkId]: !isHelath
      });
    }).catch(() => {
      setFailedNetwork({
        ...failedNetwork,
        [gnoClient.networkId]: true
      });
    });
  }

  return (
    <div>
      {children}
    </div>
  );
};
