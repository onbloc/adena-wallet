import styled from 'styled-components';

import AnimationLoadingAccount from '@assets/web/loading-account-idle.gif';

import { View, WebImg } from '@components/atoms';
import { WebTitleWithDescription } from '@components/molecules';

const StyledContainer = styled(View)`
  row-gap: 24px;
  width: 100%;
  align-items: center;
`;

const ConnectRequestWallet = (): JSX.Element => {
  return (
    <StyledContainer>
      <View style={{ paddingBottom: 16 }}>
        <WebImg src={AnimationLoadingAccount} height={120} />
      </View>
      <WebTitleWithDescription
        title='Loading Accounts'
        description={
          'We’re loading accounts from your ledger device.\nThis will take a few seconds...'
        }
        isCenter
      />
    </StyledContainer>
  );
};

export default ConnectRequestWallet;
