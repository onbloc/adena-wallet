import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { WebMain } from '@components/atoms';
import useSetupAirgapScreen, { setupAirgapStep } from '@hooks/web/setup-airgap/use-setup-airgap-screen';
import { WebMainHeader } from '@components/pages/web/main-header';
import useAppNavigate from '@hooks/use-app-navigate';
import { RoutePath } from '@types';

import SetupAirgapEnterAddress from './enter-address';
import SetupAirgapInit from './init';
import SetupAirgapCompleteScreen from './complete';

const StyledAirgapMain = styled(WebMain)`
  width: 416px;
`;

const SetupAirgapScreen: React.FC = () => {
  const {
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

  const stopNo = useMemo(() => {
    return setupAirgapStep[setupAirgapState].stepNo;
  }, [setupAirgapState]);

  const onClickBack = useCallback(() => {
    const backTo = setupAirgapStep[setupAirgapState].backTo;
    if (backTo === null) {
      navigate(RoutePath.Home);
      return;
    }
    setSetupAirgapState(backTo);
  }, [setupAirgapState]);

  return (
    <StyledAirgapMain>
      <WebMainHeader
        length={5}
        onClickGoBack={onClickBack}
        step={stopNo}
      />
      {setupAirgapState === 'INIT' &&
        <SetupAirgapInit
          initSetup={initSetup}
        />
      }
      {setupAirgapState === 'ENTER_ADDRESS' &&
        <SetupAirgapEnterAddress
          address={address}
          errorMessage={errorMessage}
          changeAddress={changeAddress}
          confirmAddress={confirmAddress}
        />
      }
      {setupAirgapState === 'COMPLETE' &&
        <SetupAirgapCompleteScreen
          address={address}
          addAccount={addAccount}
        />
      }

    </StyledAirgapMain>
  );
};

export default SetupAirgapScreen;
