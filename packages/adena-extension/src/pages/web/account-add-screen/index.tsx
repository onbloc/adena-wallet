import { ReactElement, useMemo } from 'react';

import { WebMain } from '@components/atoms';
import { WebMainHeader } from '@components/pages/web/main-header';
import useAccountAddScreen from '@hooks/web/use-account-add-screen';

import GetMnemonicStep from './create-account-step';
import SensitiveInfoStep from '@components/pages/web/sensitive-info-step';
import { ADENA_DOCS_PAGE } from '@common/constants/resource.constant';
import { WEB_TOP_SPACING, WEB_TOP_SPACING_RESPONSIVE } from '@common/constants/ui.constant';

const AccountAddScreen = (): ReactElement => {
  const useAccountAddScreenReturn = useAccountAddScreen();
  const { step, onClickGoBack, onClickNext } = useAccountAddScreenReturn;

  const topSpacing = useMemo(() => {
    if (step === 'INIT') {
      return {
        default: WEB_TOP_SPACING,
        responsive: WEB_TOP_SPACING_RESPONSIVE,
      };
    }
    return null;
  }, [step]);

  return (
    <WebMain
      spacing={topSpacing?.default || null}
      responsiveSpacing={topSpacing?.responsive || null}
    >
      {step === 'INIT' && (
        <>
          <WebMainHeader stepLength={0} onClickGoBack={onClickGoBack} />
          <SensitiveInfoStep
            desc='You are about to add a new private key derived from your existing seed phrase. Be sure to store it in a safe place.'
            onClickNext={onClickNext}
            link={`${ADENA_DOCS_PAGE}/user-guide/sidebar-menu/add-account`}
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
