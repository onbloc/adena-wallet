import { ReactElement } from 'react';

import { WebMain } from '@components/atoms';
import { WebMainHeader } from '@components/pages/web/main-header';
import useAddAccountScreen from '@hooks/web/use-add-account-screen';

import InitStep from './init-step';
import GetMnemonicStep from './create-account-step';

const AddAccountScreen = (): ReactElement => {
  const useAddAccountScreenReturn = useAddAccountScreen();
  const { step, onClickGoBack, stepLength } = useAddAccountScreenReturn;

  return (
    <WebMain>
      {step === 'INIT' && (
        <>
          <WebMainHeader stepLength={stepLength} onClickGoBack={onClickGoBack} currentStep={0} />
          <InitStep useAddAccountScreenReturn={useAddAccountScreenReturn} />
        </>
      )}

      {step === 'CREATE_ACCOUNT' && (
        <GetMnemonicStep useAddAccountScreenReturn={useAddAccountScreenReturn} />
      )}
    </WebMain>
  );
};

export default AddAccountScreen;
