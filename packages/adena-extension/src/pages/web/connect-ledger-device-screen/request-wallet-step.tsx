import { ReactElement } from 'react';
import styled, { useTheme } from 'styled-components';

import { View, WebText } from '@components/atoms';

const StyledContainer = styled(View)`
  width: 100%;
  align-items: center;
  row-gap: 24px;
`;

const RequestWalletStep = (): ReactElement => {
  const theme = useTheme();

  return (
    <StyledContainer>
      <View style={{ rowGap: 16 }}>
        <WebText type='headline3'>Open Cosmos App in Ledger</WebText>
        <WebText type='body4' color={theme.webNeutral._500}>
          Make sure the Cosmos App is opened in your ledger device.
        </WebText>
      </View>
    </StyledContainer>
  );
};

export default RequestWalletStep;
