import { ReactElement } from 'react';

import { WebMain } from '@components/atoms';
import { WebMainHeader } from '@components/pages/web/main-header';

import GetMnemonicStep from './set-mnemonic-step';
import useWalletImportScreen from '@hooks/web/use-wallet-import-screen';
import SensitiveInfoStep from '@components/pages/web/sensitive-info-step';

const WalletImportScreen = (): ReactElement => {
  const useWalletImportScreenReturn = useWalletImportScreen();
  const { step, onClickGoBack, stepLength, walletImportStepNo, onClickNext } =
    useWalletImportScreenReturn;

  return (
    <WebMain>
      <WebMainHeader
        stepLength={stepLength}
        onClickGoBack={onClickGoBack}
        currentStep={walletImportStepNo[step]}
      />
      {step === 'INIT' && (
        <SensitiveInfoStep
          desc={
            'You are about to import your seed phrase or private key on this device.\nWe recommend connecting with a hardware wallet for higher security.'
          }
          onClickNext={onClickNext}
        />
      )}
      {step === 'SET_SEED_PHRASE' && (
        <GetMnemonicStep useWalletImportScreenReturn={useWalletImportScreenReturn} />
      )}
    </WebMain>
  );
};

export default WalletImportScreen;
