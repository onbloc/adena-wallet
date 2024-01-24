import { ReactElement } from 'react';

import { WebMain } from '@components/atoms';
import { WebMainHeader } from '@components/pages/web/main-header';

import InitStep from './init-step';
import GetMnemonicStep from './get-mnemonic-step';
import useWalletCreateScreen from '@hooks/web/use-wallet-create-screen';

const WalletCreateScreen = (): ReactElement => {
  const useWalletCreateScreenReturn = useWalletCreateScreen();
  const { step, onClickGoBack, stepLength, walletCreateStepNo } = useWalletCreateScreenReturn;

  return (
    <WebMain>
      <WebMainHeader
        stepLength={stepLength}
        onClickGoBack={onClickGoBack}
        currentStep={walletCreateStepNo[step]}
      />
      {step === 'INIT' && <InitStep useWalletCreateScreenReturn={useWalletCreateScreenReturn} />}
      {step === 'GET_SEED_PHRASE' && (
        <GetMnemonicStep useWalletCreateScreenReturn={useWalletCreateScreenReturn} />
      )}
    </WebMain>
  );
};

export default WalletCreateScreen;
