import { ReactElement } from 'react';

import { WebMain } from '@components/atoms';
import { WebMainHeader } from '@components/pages/web/main-header';

import InitStep from './init-step';
import GetMnemonicStep from './set-mnemonic-step';
import useWalletImportScreen from '@hooks/web/use-wallet-import-screen';

const WalletImportScreen = (): ReactElement => {
  const useWalletImportScreenReturn = useWalletImportScreen();
  const { step, onClickGoBack, stepLength, walletImportStepNo } = useWalletImportScreenReturn;

  return (
    <WebMain>
      <WebMainHeader
        stepLength={stepLength}
        onClickGoBack={onClickGoBack}
        currentStep={walletImportStepNo[step]}
      />
      {step === 'INIT' && <InitStep useWalletImportScreenReturn={useWalletImportScreenReturn} />}
      {step === 'SET_SEED_PHRASE' && (
        <GetMnemonicStep useWalletImportScreenReturn={useWalletImportScreenReturn} />
      )}
    </WebMain>
  );
};

export default WalletImportScreen;
