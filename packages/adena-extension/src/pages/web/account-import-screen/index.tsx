import { ReactElement } from 'react';
import { Wallet } from 'adena-module';

import { WebMain } from '@components/atoms';
import { WebMainHeader } from '@components/pages/web/main-header';

import SetPrivateKeyStep from './set-privatekey-step';
import useAccountImportScreen from '@hooks/web/use-account-import-screen';
import { useWalletContext } from '@hooks/use-context';
import useAppNavigate from '@hooks/use-app-navigate';
import { RoutePath } from '@types';
import SensitiveInfoStep from '@components/pages/web/sensitive-info-step';
import { ADENA_DOCS_PAGE } from '@common/constants/resource.constant';
import WebLoadingAccounts from '@components/pages/web/loading-accounts';

const HasWallet = ({ wallet }: { wallet: Wallet }): ReactElement => {
  const useAccountImportScreenReturn = useAccountImportScreen({ wallet });
  const { step, onClickGoBack, stepLength, accountImportStepNo, onClickNext } =
    useAccountImportScreenReturn;

  if (step === 'LOADING') {
    return (
      <WebMain spacing={null}>
        <WebLoadingAccounts />
      </WebMain>
    );
  }

  return (
    <WebMain spacing={272}>
      <WebMainHeader
        stepLength={stepLength}
        onClickGoBack={onClickGoBack}
        currentStep={accountImportStepNo[step]}
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
      {step === 'SET_PRIVATE_KEY' && (
        <SetPrivateKeyStep useAccountImportScreenReturn={useAccountImportScreenReturn} />
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
    <WebMain spacing={272}>
      <WebMainHeader
        stepLength={0}
        onClickGoBack={(): void => {
          navigate(RoutePath.WebAdvancedOption);
        }}
      />
    </WebMain>
  )
};

export default AccountImportScreen;
