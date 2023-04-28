import { useCurrentAccount } from "@hooks/use-current-account";
import React, { useEffect } from "react";
import { useNetwork } from "@hooks/use-network";
import { useTokenMetainfo } from "@hooks/use-token-metainfo";
import { useTokenBalance } from "@hooks/use-token-balance";
import { useWalletContext } from "@hooks/use-context";
import { useAccountName } from "@hooks/use-account-name";

type BackgroundProps = React.PropsWithChildren<unknown>;

export const Background: React.FC<BackgroundProps> = ({ children }) => {
  const { wallet } = useWalletContext();
  const { initAccountNames } = useAccountName();
  const { currentAccount } = useCurrentAccount();
  const { currentNetwork } = useNetwork();
  const { tokenMetainfos, initTokenMetainfos } = useTokenMetainfo();
  const { updateTokenBalanceInfos } = useTokenBalance();

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

  return (
    <div>
      {children}
    </div>
  );
};
