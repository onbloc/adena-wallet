import React, { useMemo } from 'react';
import { useRecoilState } from 'recoil';
import { NetworkState, WalletState } from '@states';
import { ErrorNetwork } from './error-network';

interface Props {
  failedNetwork: boolean | null;
  children: React.ReactNode;
}

export const ErrorContainer = ({ failedNetwork, children }: Props): JSX.Element => {
  const [currentNetwork] = useRecoilState(NetworkState.currentNetwork);
  const [currentAccount] = useRecoilState(WalletState.currentAccount);

  const isError = useMemo(() => {
    if (!currentNetwork) {
      return false;
    }
    return failedNetwork === true;
  }, [failedNetwork, currentNetwork, currentAccount]);

  return isError ? <ErrorNetwork /> : <React.Fragment>{children}</React.Fragment>;
};
