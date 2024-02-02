import { ReactElement } from 'react';

import { ADENA_DOCS_PAGE } from '@common/constants/resource.constant';
import { WebMain } from '@components/atoms';
import { WebMainHeader } from '@components/pages/web/main-header';

import GetMnemonicStep from './set-mnemonic-step';
import useWalletImportScreen from '@hooks/web/use-wallet-import-screen';
import SensitiveInfoStep from '@components/pages/web/sensitive-info-step';
import WebLoadingAccounts from '@components/pages/web/loading-accounts';

const WalletImportScreen = (): ReactElement => {
  const useWalletImportScreenReturn = useWalletImportScreen();
  const { extended, step, onClickGoBack, indicatorInfo, onClickNext } = useWalletImportScreenReturn;

  if (step === 'LOADING') {
    return (
      <WebMain spacing={344}>
        <WebLoadingAccounts />
      </WebMain>
    );
  }

  return (
    <WebMain spacing={extended ? 180 : 272}>
      <WebMainHeader
        stepLength={indicatorInfo.stepLength}
        onClickGoBack={onClickGoBack}
        currentStep={indicatorInfo.stepNo}
      />
      {step === 'INIT' && (
        <SensitiveInfoStep
          desc={
            'You are about to import your seed phrase or private key on this device.\nWe recommend connecting with a hardware wallet for higher security.'
          }
          onClickNext={onClickNext}
          link={`${ADENA_DOCS_PAGE}/user-guide/sign-in/import-wallet`}
        />
      )}
      {step === 'SET_SEED_PHRASE' && (
        <GetMnemonicStep useWalletImportScreenReturn={useWalletImportScreenReturn} />
      )}
    </WebMain>
  );
};

export default WalletImportScreen;
