import styled, { useTheme } from 'styled-components';

import openCosmosGif from '@assets/web/open-cosmos.gif';

import { View, WebText, WebImg } from '@components/atoms';

const StyledContainer = styled(View)`
  row-gap: 40px;
  width: 100%;
  align-items: center;
`;

const StyledMessageBox = styled(View)`
  row-gap: 16px;
`;

const ConnectRequestWallet = (): JSX.Element => {
  const theme = useTheme();
  return (
    <StyledContainer>
      <View style={{ paddingBottom: 16 }}>
        <WebImg src={openCosmosGif} height={120} />
      </View>
      <StyledMessageBox>
        <WebText type='headline2'>Open Cosmos App in Ledger</WebText>
        <WebText type='body4' color={theme.webNeutral._500} textCenter>
          Make sure the Cosmos App is opened in your ledger device.
        </WebText>
      </StyledMessageBox>
    </StyledContainer>
  );
};

export default ConnectRequestWallet;
