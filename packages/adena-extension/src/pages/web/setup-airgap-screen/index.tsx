import React, { useCallback } from 'react';

import { WebMain } from '@components/atoms';
import useSetupAirgapScreen, {
  setupAirgapStep,
} from '@hooks/web/setup-airgap/use-setup-airgap-screen';
import { WebMainHeader } from '@components/pages/web/main-header';
import useAppNavigate from '@hooks/use-app-navigate';
import { RoutePath } from '@types';

import SetupAirgapEnterAddress from './enter-address';
import SetupAirgapInit from './init';
import SetupAirgapCompleteScreen from './complete';
import WebLoadingAccounts from '@components/pages/web/loading-accounts';

const SetupAirgapScreen: React.FC = () => {
  const {
    indicatorInfo,
    setupAirgapState,
    address,
    errorMessage,
    setSetupAirgapState,
    initSetup,
    changeAddress,
    confirmAddress,
    addAccount,
  } = useSetupAirgapScreen();
  const { navigate } = useAppNavigate();

  const onClickBack = useCallback(() => {
    const backTo = setupAirgapStep[setupAirgapState].backTo;
    if (backTo === null) {
      navigate(RoutePath.Home);
      return;
    }
    changeAddress('');
    setSetupAirgapState(backTo);
  }, [setupAirgapState]);

  return (
    <WebMain spacing={272}>
      {setupAirgapState !== 'LOADING' && (
        <WebMainHeader stepLength={indicatorInfo.stepLength} onClickGoBack={onClickBack} currentStep={indicatorInfo.stepNo} />
      )}

      {setupAirgapState === 'INIT' && (
        <SetupAirgapInit initSetup={initSetup} />
      )}
      {setupAirgapState === 'ENTER_ADDRESS' && (
        <SetupAirgapEnterAddress
          address={address}
          errorMessage={errorMessage}
          changeAddress={changeAddress}
          confirmAddress={confirmAddress}
        />
      )}
      {setupAirgapState === 'COMPLETE' && (
        <SetupAirgapCompleteScreen address={address} addAccount={addAccount} />
      )}
      {setupAirgapState === 'LOADING' && (
        <WebLoadingAccounts spacing={344 - 272} />
      )}
    </WebMain>
  );
};

export default SetupAirgapScreen;
