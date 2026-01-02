import React, { useCallback, useMemo } from 'react';

import useSetupMultisigScreen, {
  setupMultisigStepBackTo,
} from '@hooks/web/setup-multisig/use-setup-multisig-screen';

import useAppNavigate from '@hooks/use-app-navigate';
import { RoutePath } from '@types';
import { useCurrentAccount } from '@hooks/use-current-account';
import { WEB_TOP_SPACING, WEB_TOP_SPACING_RESPONSIVE } from '@common/constants/ui.constant';

import { WebMain } from '@components/atoms';
import { WebMainHeader } from '@components/pages/web/main-header';
import SetupMultisigConfig from './enter-multisig-config';
import SetupMultisigInit from './init';
import SetupMultisigCompleteScreen from './complete';
import WebLoadingAccounts from '@components/pages/web/loading-accounts';

const SetupMultisigScreen: React.FC = () => {
  const { navigate } = useAppNavigate();
  const { currentAddress } = useCurrentAccount();
  const {
    setupMultisigState,
    setSetupMultisigState,
    initSetup,
    indicatorInfo,
    multisigConfig,
    addSigner,
    removeSigner,
    updateSigner,
    updateThreshold,
    multisigConfigError,
    createMultisigAccount,
    createdMultisigAddress,
    resetMultisigConfig,
    multisigAccountMode,
  } = useSetupMultisigScreen();

  const topSpacing = useMemo(() => {
    if (setupMultisigState === 'LOADING') {
      return null;
    }
    return {
      default: WEB_TOP_SPACING,
      responsive: WEB_TOP_SPACING_RESPONSIVE,
    };
  }, [setupMultisigState]);

  const webMainStyle = useMemo(() => {
    if (setupMultisigState === 'ENTER_MULTISIG_CONFIG') {
      return {
        height: 'auto',
        paddingBottom: 40,
      };
    }
    return {};
  }, [setupMultisigState]);

  const onClickBack = useCallback(() => {
    const backTo = setupMultisigStepBackTo[setupMultisigState];
    if (backTo === null) {
      navigate(RoutePath.Home);
      return;
    }
    resetMultisigConfig();
    setSetupMultisigState(backTo);
  }, [setupMultisigState, resetMultisigConfig, navigate, setSetupMultisigState]);

  const navigateToAccountAddedComplete = useCallback(() => {
    navigate(RoutePath.WebAccountAddedComplete);
  }, [navigate]);

  return (
    <WebMain
      spacing={topSpacing?.default || null}
      responsiveSpacing={topSpacing?.responsive || null}
      style={webMainStyle}
    >
      {setupMultisigState !== 'LOADING' && (
        <WebMainHeader
          stepLength={indicatorInfo.stepLength}
          onClickGoBack={onClickBack}
          currentStep={indicatorInfo.stepNo}
        />
      )}

      {setupMultisigState === 'INIT' && (
        <SetupMultisigInit initSetup={initSetup} currentAddress={currentAddress} />
      )}
      {setupMultisigState === 'ENTER_MULTISIG_CONFIG' && (
        <SetupMultisigConfig
          currentAddress={currentAddress || ''}
          multisigConfig={multisigConfig}
          multisigConfigError={multisigConfigError}
          onAddSigner={addSigner}
          onRemoveSigner={removeSigner}
          onSignerChange={updateSigner}
          onThresholdChange={updateThreshold}
          onCreateMultisigAccount={createMultisigAccount}
          multisigAccountMode={multisigAccountMode}
        />
      )}
      {setupMultisigState === 'COMPLETE' && (
        <SetupMultisigCompleteScreen
          address={createdMultisigAddress}
          onNext={navigateToAccountAddedComplete}
        />
      )}
      {setupMultisigState === 'LOADING' && <WebLoadingAccounts />}
    </WebMain>
  );
};

export default SetupMultisigScreen;
