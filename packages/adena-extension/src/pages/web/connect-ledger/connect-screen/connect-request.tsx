import styled from 'styled-components';
import Lottie from 'react-lottie';

import animationData from '@assets/web/lottie/requesting-permission.json';

import { View } from '@components/atoms';
import { WebTitleWithDescription } from '@components/molecules';

const StyledContainer = styled(View)`
  row-gap: 24px;
  width: 100%;
  align-items: center;
`;

const ConnectRequest = (): JSX.Element => {
  return (
    <StyledContainer>
      <View style={{ paddingBottom: 16 }}>
        <Lottie options={{ animationData }} height={120} />
      </View>
      <WebTitleWithDescription
        title='Requesting Permission'
        description='Approve the connection request in your browser.'
        isCenter
      />
    </StyledContainer>
  );
};

export default ConnectRequest;
