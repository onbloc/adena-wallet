import React, { ReactElement } from 'react';
import styled from 'styled-components';

import { Button, Text } from '@components/atoms';
import useAppNavigate from '@hooks/use-app-navigate';
import { RoutePath } from '@types';

const StyledContainer = styled.main``;

const LandingScreen = (): ReactElement => {
  const { navigate } = useAppNavigate();
  return (
    <StyledContainer>
      <Text type='header1'>Welcome to Adena</Text>
      <Button onClick={(): void => navigate(RoutePath.WebConnectLedgerDeviceScreen)}>
        Go to Home
      </Button>
    </StyledContainer>
  );
};

export default LandingScreen;
