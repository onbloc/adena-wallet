import { ReactElement } from 'react';

import { WebMain } from '@components/atoms';
import { WebMainHeader } from '@components/pages/web/main-header';
import useAccountAddScreen from '@hooks/web/use-account-add-screen';

import GetMnemonicStep from './create-account-step';
import SensitiveInfoStep from '@components/pages/web/sensitive-info-step';

const AccountAddScreen = (): ReactElement => {
  const useAccountAddScreenReturn = useAccountAddScreen();
  const { step, onClickGoBack, stepLength, onClickNext } = useAccountAddScreenReturn;

  return (
    <WebMain>
      {step === 'INIT' && (
        <>
          <WebMainHeader stepLength={stepLength} onClickGoBack={onClickGoBack} currentStep={0} />
          <SensitiveInfoStep
            desc='You are about to add a new private key derived from your existing seed phrase. Be sure to store it in a safe place.'
            onClickNext={onClickNext}
          />
        </>
      )}

      {step === 'CREATE_ACCOUNT' && (
        <GetMnemonicStep useAccountAddScreenReturn={useAccountAddScreenReturn} />
      )}
    </WebMain>
  );
};

export default AccountAddScreen;
