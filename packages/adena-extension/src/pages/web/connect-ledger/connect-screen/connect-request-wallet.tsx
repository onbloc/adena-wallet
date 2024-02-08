import styled from 'styled-components';

import openCosmosGif from '@assets/web/open-cosmos.gif';

import { View, WebImg } from '@components/atoms';
import { WebTitleWithDescription } from '@components/molecules';

const StyledContainer = styled(View)`
  row-gap: 40px;
  width: 100%;
  align-items: center;
`;

const ConnectRequestWallet = (): JSX.Element => {
  return (
    <StyledContainer>
      <View>
        <WebImg src={openCosmosGif} height={120} />
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
