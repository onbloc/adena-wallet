import styled, { useTheme } from 'styled-components';

import openCosmosGif from '@assets/web/open-cosmos.gif';

import { View, WebText, WebImg } from '@components/atoms';

const StyledContainer = styled(View)`
  row-gap: 24px;
  width: 552px;
  align-items: center;
`;

const StyledMessageBox = styled(View)`
  row-gap: 16px;
`;

const ConnectRequestWallet = (): JSX.Element => {
  const theme = useTheme();
  return (
    <StyledContainer>
      <WebImg src={openCosmosGif} height={120} />
      <StyledMessageBox>
        <WebText type='headline3'>Open Cosmos App in Ledger</WebText>
        <WebText type='body4' color={theme.webNeutral._500}>
          Make sure the Cosmos App is opened in your ledger device.
        </WebText>
      </StyledMessageBox>
    </StyledContainer>
  );
};

export default ConnectRequestWallet;
