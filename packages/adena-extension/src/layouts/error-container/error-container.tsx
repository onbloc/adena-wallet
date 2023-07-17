import React from 'react';
import { useRecoilState } from 'recoil';
import { CommonState, NetworkState } from '@states/index';
import { ErrorNetwork } from '@components/errors';

interface Props {
  children: React.ReactNode;
}

export const ErrorContainer = ({ children }: Props) => {
  const [failedNetwork] = useRecoilState(CommonState.failedNetwork);
  const [currentNetwork] = useRecoilState(NetworkState.currentNetwork);

  const isError = () => {
    if (!currentNetwork) {
      return false;
    }
    return failedNetwork[currentNetwork.id];
  }

  return isError() ?
    <ErrorNetwork /> :
    <div>{children}</div>
    ;
};
