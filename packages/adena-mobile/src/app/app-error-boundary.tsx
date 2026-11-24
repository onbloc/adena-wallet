import React, { PropsWithChildren, ReactElement, ReactNode } from 'react';

import { AppFailurePage } from '../components/pages';
import { useLockWallet } from '../hooks/use-lock-wallet';
import { ErrorBoundary } from './error-boundary';

// The fallback unmounts the auto-lock timers, so a crash locks the wallet instead of leaving it open.
export const AppErrorBoundary = ({ children }: PropsWithChildren): ReactElement => {
  const lockWallet = useLockWallet();

  const renderFallback = (reset: () => void): ReactNode => (
    <AppFailurePage
      title='Something went wrong'
      description='The screen hit an unexpected error.'
      actions={[{ label: 'Reload', onPress: reset }]}
    />
  );

  return (
    <ErrorBoundary fallback={renderFallback} onError={lockWallet}>
      {children}
    </ErrorBoundary>
  );
};
