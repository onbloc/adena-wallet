import { ReactElement } from 'react';

import { WebMain } from '@components/atoms';
import { WebMainHeader } from '@components/pages/web/main-header';
import useAccountAddScreen from '@hooks/web/use-account-add-screen';

import InitStep from './init-step';
import GetMnemonicStep from './create-account-step';

const AccountAddScreen = (): ReactElement => {
  const useAccountAddScreenReturn = useAccountAddScreen();
  const { step, onClickGoBack, stepLength } = useAccountAddScreenReturn;

  return (
    <WebMain>
      {step === 'INIT' && (
        <>
          <WebMainHeader stepLength={stepLength} onClickGoBack={onClickGoBack} currentStep={0} />
          <InitStep useAccountAddScreenReturn={useAccountAddScreenReturn} />
        </>
      )}

      {step === 'CREATE_ACCOUNT' && (
        <GetMnemonicStep useAccountAddScreenReturn={useAccountAddScreenReturn} />
      )}
    </WebMain>
  );
};

export default AccountAddScreen;
