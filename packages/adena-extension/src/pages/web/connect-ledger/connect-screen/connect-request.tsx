import styled, { useTheme } from 'styled-components';
import Lottie from 'react-lottie';

import animationData from '@assets/web/lottie/requesting-permission.json';

import { View, WebText } from '@components/atoms';

const StyledContainer = styled(View)`
  row-gap: 24px;
  width: 100%;
  align-items: center;
`;

const StyledMessageBox = styled(View)`
  row-gap: 16px;
`;

const ConnectRequest = (): JSX.Element => {
  const theme = useTheme();
  return (
    <StyledContainer>
      <View style={{ paddingBottom: 16 }}>
        <Lottie options={{ animationData }} height={120} />
      </View>
      <StyledMessageBox>
        <WebText type='headline2'>Requesting Permission</WebText>
        <WebText type='body4' color={theme.webNeutral._500}>
          Approve the connection request in your browser.
        </WebText>
      </StyledMessageBox>
    </StyledContainer>
  );
};

export default ConnectRequest;
