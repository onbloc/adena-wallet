import React from 'react';
import { useRecoilState } from 'recoil';
import { CommonState } from '@states/index';
import { ErrorNetwork } from '@components/errors';
import { useGnoClient } from '@hooks/use-gno-client';

interface Props {
  children: React.ReactNode;
}

export const ErrorContainer = ({ children }: Props) => {
  const [gnoClient] = useGnoClient();
  const [failedNetwork] = useRecoilState(CommonState.failedNetwork);
  const [failedNetworkChainId] = useRecoilState(CommonState.failedNetworkChainId);

  const isError = () => {
    return failedNetwork === true && gnoClient?.chainId === failedNetworkChainId;
  }

  return isError() ?
    <ErrorNetwork /> :
    <div>{children}</div>
    ;
};
