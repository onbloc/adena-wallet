import React, { useEffect, useState } from 'react';
import { ApproveInjectionLoadingWrapper } from './approve-injection-loading.styles';
import { Spinner } from '@components/atoms';

export interface ApproveInjectionLoadingProps {
  wait?: number;
  timeout?: number;
  done: boolean;
  onResponse: () => void;
  onTimeout: () => void;
}

const INTERVAL_DURATION = 500;
const TIMEOUT_DEFAULT = 0; // milliseconds

export const ApproveInjectionLoading: React.FC<ApproveInjectionLoadingProps> = ({
  wait = 1000,
  timeout = TIMEOUT_DEFAULT,
  done,
  onResponse,
  onTimeout,
}) => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick(tick + INTERVAL_DURATION);
    }, INTERVAL_DURATION);

    if (done) {
      if (tick > wait) {
        onResponse();
        clearInterval(interval);
        return;
      }
    }

    if (timeout !== 0 && tick > timeout) {
      onTimeout();
      clearInterval(interval);
      return;
    }

    return () => clearInterval(interval);
  }, [tick, done]);

  return (
    <ApproveInjectionLoadingWrapper>
      <Spinner />
      <span className='description'>{'Processing Request...'}</span>
      <span className='sub-description'>{'Hang tight, we`re working on it!'}</span>
    </ApproveInjectionLoadingWrapper>
  );
};
