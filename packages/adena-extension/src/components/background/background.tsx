import { useCurrentAccount } from "@hooks/use-current-account";
import React, { useEffect } from "react";
import { useNetwork } from "@hooks/use-network";
import { useTokenMetainfo } from "@hooks/use-token-metainfo";
import { useTokenBalance } from "@hooks/use-token-balance";

type BackgroundProps = React.PropsWithChildren<unknown>;

export const Background: React.FC<BackgroundProps> = ({ children }) => {
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

  return (
    <div>
      {children}
    </div>
  );
};
