import { Wallet } from 'adena-module';
import { ReactElement, useMemo } from 'react';

import { WebMain } from '@components/atoms';
import { WebMainHeader } from '@components/pages/web/main-header';

import { ADENA_DOCS_PAGE } from '@common/constants/resource.constant';
import { WEB_TOP_SPACING, WEB_TOP_SPACING_RESPONSIVE } from '@common/constants/ui.constant';
import WebLoadingAccounts from '@components/pages/web/loading-accounts';
import SensitiveInfoStep from '@components/pages/web/sensitive-info-step';
import useAppNavigate from '@hooks/use-app-navigate';
import { useWalletContext } from '@hooks/use-context';
import useAccountImportScreen from '@hooks/web/use-account-import-screen';
import { RoutePath } from '@types';
import SelectAccountStep from './select-account-step';
import SetMnemonicStep from './set-mnemonic-step';

const HasWallet = ({ wallet }: { wallet: Wallet }): ReactElement => {
  const useAccountImportScreenReturn = useAccountImportScreen({ wallet });
  const { inputType, step, onClickGoBack, indicatorInfo, onClickNext } =
    useAccountImportScreenReturn;

  const extended = useMemo(() => {
    if (step === 'SELECT_ACCOUNT') {
      return true;
    }

    return inputType === '24seeds';
  }, [inputType]);

  const topSpacing = useMemo(() => {
    if (extended) {
      return null;
    }
    return {
      default: WEB_TOP_SPACING,
      responsive: WEB_TOP_SPACING_RESPONSIVE,
    };
  }, [extended]);

  if (step === 'LOADING') {
    return (
      <WebMain spacing={null}>
        <WebLoadingAccounts />
      </WebMain>
    );
  }

  return (
    <WebMain
      spacing={topSpacing?.default || null}
      responsiveSpacing={topSpacing?.responsive || null}
    >
      <WebMainHeader
        stepLength={indicatorInfo.stepLength}
        currentStep={indicatorInfo.stepNo}
        onClickGoBack={onClickGoBack}
      />
      {step === 'INIT' && (
        <SensitiveInfoStep
          desc={
            'You are about to import your private key on this device. We recommend connecting with a hardware wallet for higher security.'
          }
          onClickNext={onClickNext}
          link={`${ADENA_DOCS_PAGE}/user-guide/sign-in/import-wallet`}
        />
      )}
      {step === 'SET_MNEMONIC' && (
        <SetMnemonicStep useAccountImportScreenReturn={useAccountImportScreenReturn} />
      )}
      {step === 'SELECT_ACCOUNT' && (
        <SelectAccountStep useAccountImportScreenReturn={useAccountImportScreenReturn} />
      )}
    </WebMain>
  );
};

const AccountImportScreen = (): ReactElement => {
  const { wallet } = useWalletContext();
  const { navigate } = useAppNavigate();

  return wallet ? (
    <HasWallet wallet={wallet} />
  ) : (
    <WebMain spacing={WEB_TOP_SPACING} responsiveSpacing={WEB_TOP_SPACING_RESPONSIVE}>
      <WebMainHeader
        stepLength={0}
        onClickGoBack={(): void => {
          navigate(RoutePath.WebAdvancedOption);
        }}
      />
    </WebMain>
  );
};

export default AccountImportScreen;
