import { useCurrentAccount } from "@hooks/use-current-account";
import React, { useEffect } from "react";
import { useNetwork } from "@hooks/use-network";
import { useTokenBalance } from "@hooks/use-token-balance";

type BackgroundProps = React.PropsWithChildren<unknown>;

export const Background: React.FC<BackgroundProps> = ({ children }) => {
  const { currentAccount } = useCurrentAccount();
  const { currentNetwork } = useNetwork();
  const { updateMainBalanceByAccount } = useTokenBalance();

  useEffect(() => {
    if (currentAccount && currentNetwork) {
      updateMainBalanceByAccount(currentAccount)
    }
  }, [currentAccount, currentNetwork])

  return (
    <div>
      {children}
    </div>
  );
};
