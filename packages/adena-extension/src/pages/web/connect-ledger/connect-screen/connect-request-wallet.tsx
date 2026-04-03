import AnimationOpenCosmosApp from '@assets/web/lottie/open-cosmos-app-in-your-ledger.json';
import { View } from '@components/atoms';
import Lottie from '@components/atoms/lottie';
import { WebTitleWithDescription } from '@components/molecules';
import type { JSX } from 'react';
import styled from 'styled-components';

const StyledContainer = styled(View)`
  row-gap: 40px;
  width: 100%;
  align-items: center;
`;

const ConnectRequestWallet = (): JSX.Element => {
  return (
    <StyledContainer>
      <View>
        <Lottie
          speed={1}
          height={120}
          animationData={AnimationOpenCosmosApp}
        />
      </View>
      <WebTitleWithDescription
        title='Open Cosmos App in Ledger'
        description='Make sure the Cosmos App is opened in your ledger device.'
        isCenter
      />
    </StyledContainer>
  );
};

export default ConnectRequestWallet;
