import React, { useMemo } from 'react';
import { useRecoilState } from 'recoil';
import { NetworkState, WalletState } from '@states';
import { ErrorNetwork } from './error-network';
import { useNetwork } from '@hooks/use-network';

interface Props {
  children: React.ReactNode;
}

export const ErrorContainer = ({ children }: Props): JSX.Element => {
  const { failedNetwork } = useNetwork();
  const [currentNetwork] = useRecoilState(NetworkState.currentNetwork);
  const [currentAccount] = useRecoilState(WalletState.currentAccount);

  const isError = useMemo(() => {
    if (!currentNetwork) {
      return false;
    }
    return failedNetwork;
  }, [failedNetwork, currentNetwork, currentAccount]);

  return isError ? <ErrorNetwork /> : <React.Fragment>{children}</React.Fragment>;
};
