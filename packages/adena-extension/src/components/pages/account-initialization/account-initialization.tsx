import { waitForRun } from '@common/utils/timeout-utils';
import AccountInitializationInit from '@components/molecules/account-initialization-init/account-initialization-init';
import AccountInitializationResult from '@components/molecules/account-initialization-result/account-initialization-result';
import React, { useEffect, useState } from 'react';

export interface AccountInitializationProps {
  address: string | null;
  moveBack: () => void;
  initializeAccount: () => Promise<boolean>;
}

const enum AccountInitializationState {
  INIT = 'INIT',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
}

const AccountInitialization: React.FC<AccountInitializationProps> = ({
  address,
  moveBack,
  initializeAccount,
}) => {
  const [state, setState] = useState<AccountInitializationState>(AccountInitializationState.INIT);

  const moveRequest = (): void => {
    setState(AccountInitializationState.LOADING);
    waitForRun(initializeAccount, 500).then((success) => {
      if (success) {
        setState(AccountInitializationState.SUCCESS);
      } else {
        setState(AccountInitializationState.FAILURE);
      }
    });
  };

  const moveInit = (): void => {
    setState(AccountInitializationState.INIT);
  };

  useEffect(() => {
    if (state === AccountInitializationState.SUCCESS) {
      setTimeout(() => {
        moveBack();
      }, 1000);
    }
  }, [state]);

  if (state === AccountInitializationState.INIT) {
    return (
      <AccountInitializationInit
        address={address || ''}
        moveRequest={moveRequest}
        moveBack={moveBack}
      />
    );
  }

  return <AccountInitializationResult state={state} moveInit={moveInit} moveBack={moveBack} />;
};

export default AccountInitialization;
