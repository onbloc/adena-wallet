import React from 'react';
import { useRecoilState } from 'recoil';
import { CommonState } from '@states/index';
import { ErrorNetwork } from '@components/errors';

interface Props {
  children: React.ReactNode;
}

export const ErrorContainer = ({ children }: Props) => {
  const [failedNetwork] = useRecoilState(CommonState.failedNetwork);
  return failedNetwork ?
    <ErrorNetwork /> :
    <>{children}</>;
};
