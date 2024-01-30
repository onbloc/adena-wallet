import { ReactElement } from 'react';

import { WebMain } from '@components/atoms';
import { WebMainHeader } from '@components/pages/web/main-header';
import useAccountAddScreen from '@hooks/web/use-account-add-screen';

import GetMnemonicStep from './create-account-step';
import SensitiveInfoStep from '@components/pages/web/sensitive-info-step';
import { ADENA_DOCS_PAGE } from '@common/constants/resource.constant';

const description = 'This will generate a seed phrase on your device. Only proceed if you \nunderstand how to safely store your seed phrase.';

const AccountAddScreen = (): ReactElement => {
  const useAccountAddScreenReturn = useAccountAddScreen();
  const { step, onClickGoBack, onClickNext } = useAccountAddScreenReturn;

  return (
    <WebMain>
      {step === 'INIT' && (
        <>
          <WebMainHeader stepLength={0} onClickGoBack={onClickGoBack} />
          <SensitiveInfoStep
            desc={description}
            link={`${ADENA_DOCS_PAGE}/user-guide/sidebar-menu/add-account`}
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
