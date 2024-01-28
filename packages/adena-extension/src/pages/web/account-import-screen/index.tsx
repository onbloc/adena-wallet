import { ReactElement } from 'react';
import { Wallet } from 'adena-module';

import { WebMain } from '@components/atoms';
import { WebMainHeader } from '@components/pages/web/main-header';

import InitStep from './init-step';
import SetPrivateKeyStep from './set-privatekey-step';
import useAccountImportScreen from '@hooks/web/use-account-import-screen';
import { useWalletContext } from '@hooks/use-context';
import useAppNavigate from '@hooks/use-app-navigate';
import { RoutePath } from '@types';

const HasWallet = ({ wallet }: { wallet: Wallet }): ReactElement => {
  const useAccountImportScreenReturn = useAccountImportScreen({ wallet });
  const { step, onClickGoBack, stepLength, accountImportStepNo } = useAccountImportScreenReturn;

  return (
    <>
      <WebMainHeader
        stepLength={stepLength}
        onClickGoBack={onClickGoBack}
        currentStep={accountImportStepNo[step]}
      />
      {step === 'INIT' && <InitStep useAccountImportScreenReturn={useAccountImportScreenReturn} />}
      {step === 'SET_PRIVATE_KEY' && (
        <SetPrivateKeyStep useAccountImportScreenReturn={useAccountImportScreenReturn} />
      )}
    </>
  );
};

const AccountImportScreen = (): ReactElement => {
  const { wallet } = useWalletContext();
  const { navigate } = useAppNavigate();

  return (
    <WebMain style={{ width: 520 }}>
      {wallet ? (
        <HasWallet wallet={wallet} />
      ) : (
        <>
          <>
            <WebMainHeader
              stepLength={0}
              onClickGoBack={(): void => {
                navigate(RoutePath.WebAdvancedOption);
              }}
            />
          </>
        </>
      )}
    </WebMain>
  );
};

export default AccountImportScreen;
