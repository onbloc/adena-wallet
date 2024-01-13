import React, { ReactElement } from 'react';
import styled from 'styled-components';

import { Text } from '@components/atoms';

const StyledContainer = styled.main``;

const ConnectLedgerDeviceScreen = (): ReactElement => {
  return (
    <StyledContainer>
      <Text type='header1'>ConnectLedgerDeviceScreen</Text>
    </StyledContainer>
  );
};

export default ConnectLedgerDeviceScreen;
