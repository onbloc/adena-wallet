import { ReactElement } from 'react';
import styled, { useTheme } from 'styled-components';

import { View, WebText } from '@components/atoms';

const StyledContainer = styled(View)`
  width: 100%;
  align-items: center;
  row-gap: 24px;
`;

const LoadAccountsStep = (): ReactElement => {
  const theme = useTheme();

  return (
    <StyledContainer>
      <View style={{ rowGap: 16 }}>
        <WebText type='headline3'>Loading Accounts</WebText>
        <WebText type='body4' color={theme.webNeutral._500}>
          {'We’re loading accounts from your ledger device.\nThis will take a few seconds...'}
        </WebText>
      </View>
    </StyledContainer>
  );
};

export default LoadAccountsStep;
