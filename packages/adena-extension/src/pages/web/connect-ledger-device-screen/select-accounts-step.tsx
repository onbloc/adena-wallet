import { ReactElement } from 'react';
import styled, { useTheme } from 'styled-components';

import { View, WebText } from '@components/atoms';

const StyledContainer = styled(View)`
  width: 100%;
  align-items: center;
  row-gap: 24px;
`;

const SelectAccountsStep = (): ReactElement => {
  const theme = useTheme();

  return (
    <StyledContainer>
      <View style={{ rowGap: 16 }}>
        <WebText type='headline3'>Select Accounts</WebText>
        <WebText type='body4' color={theme.webNeutral._500}>
          Select all accounts you wish to add to Adena.
        </WebText>
      </View>
    </StyledContainer>
  );
};

export default SelectAccountsStep;
