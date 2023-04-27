import { useCurrentAccount } from "@hooks/use-current-account";
import React, { useEffect } from "react";
import { useNetwork } from "@hooks/use-network";
import { useTokenMetainfo } from "@hooks/use-token-metainfo";
import { useTokenBalance } from "@hooks/use-token-balance";

type BackgroundProps = React.PropsWithChildren<unknown>;

export const Background: React.FC<BackgroundProps> = ({ children }) => {
  const { currentAccount } = useCurrentAccount();
  const { currentNetwork } = useNetwork();
  const { initTokenMetainfos } = useTokenMetainfo();
  const { updateBalanceAmountByAccount } = useTokenBalance();

  useEffect(() => {
    if (currentAccount && currentNetwork) {
      initTokenMetainfos().then(() => updateBalanceAmountByAccount(currentAccount));
    }
  }, [currentAccount, currentNetwork])

  return (
    <div>
      {children}
    </div>
  );
};
