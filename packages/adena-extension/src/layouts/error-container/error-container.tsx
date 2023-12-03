import React, { useMemo } from 'react';
import { useRecoilState } from 'recoil';
import { CommonState, NetworkState, WalletState } from '@states/index';
import { ErrorNetwork } from '@components/errors';

interface Props {
  children: React.ReactNode;
}

export const ErrorContainer = ({ children }: Props): JSX.Element => {
  const [failedNetwork] = useRecoilState(CommonState.failedNetwork);
  const [currentNetwork] = useRecoilState(NetworkState.currentNetwork);
  const [currentAccount] = useRecoilState(WalletState.currentAccount);

  const isError = useMemo(() => {
    if (!currentNetwork) {
      return false;
    }
    return failedNetwork[currentNetwork.id] === true;
  }, [failedNetwork, currentNetwork, currentAccount]);

  return isError ? <ErrorNetwork /> : <div>{children}</div>;
};
