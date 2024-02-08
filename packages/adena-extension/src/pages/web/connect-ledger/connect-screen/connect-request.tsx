import styled from 'styled-components';

import animationData from '@assets/web/lottie/requesting-permission.json';

import { View } from '@components/atoms';
import { WebTitleWithDescription } from '@components/molecules';
import Lottie from '@components/atoms/lottie';

const StyledContainer = styled(View)`
  row-gap: 24px;
  width: 100%;
  align-items: center;
`;

const ConnectRequest = (): JSX.Element => {
  return (
    <StyledContainer>
      <View style={{ paddingBottom: 16 }}>
        <Lottie
          animationData={animationData}
          style={{ height: 120 }}
        />
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
