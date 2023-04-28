import React from 'react';
import { useRecoilState } from 'recoil';
import { CommonState } from '@states/index';
import { ErrorNetwork } from '@components/errors';

interface Props {
  children: React.ReactNode;
}

export const ErrorContainer = ({ children }: Props) => {
  const [failedNetwork] = useRecoilState(CommonState.failedNetwork);

  const isError = () => {
    return failedNetwork === true;
  }

  return isError() ?
    <ErrorNetwork /> :
    <div>{children}</div>
    ;
};
