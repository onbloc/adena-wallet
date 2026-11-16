import { ReactElement, useMemo, useState } from 'react';

import { WebMain } from '@components/atoms';
import { WebMainHeader } from '@components/pages/web/main-header';
import useAccountAddScreen from '@hooks/web/use-account-add-screen';

import { ADENA_DOCS_PAGE } from '@common/constants/resource.constant';
import { WEB_TOP_SPACING } from '@common/constants/ui.constant';
import SensitiveInfoStep from '@components/pages/web/sensitive-info-step';
import CreateAccountStep from './create-account-step';
import SelectSeedPhraseStep from './select-seed-phrase-step';

const AccountAddScreen = (): ReactElement => {
  const useAccountAddScreenReturn = useAccountAddScreen();
  const { step, onClickGoBack, onClickNext } = useAccountAddScreenReturn;

  const [selectedKeyringId, setSelectedKeyringId] = useState<string>();

  const topSpacing = useMemo(() => {
    if (step === 'INIT') {
      return {
        default: WEB_TOP_SPACING,
        responsive: WEB_TOP_SPACING,
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

      {step === 'SELECT_SEED_PHRASE' && (
        <SelectSeedPhraseStep
          selectedKeyringId={selectedKeyringId}
          setSelectedKeyringId={setSelectedKeyringId}
          useAccountAddScreenReturn={useAccountAddScreenReturn}
        />
      )}

      {step === 'CREATE_ACCOUNT' && (
        <CreateAccountStep
          selectedKeyringId={selectedKeyringId}
          useAccountAddScreenReturn={useAccountAddScreenReturn}
        />
      )}
    </WebMain>
  );
};

export default AccountAddScreen;
