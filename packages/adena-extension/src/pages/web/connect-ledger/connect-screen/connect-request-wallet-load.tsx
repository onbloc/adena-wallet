import AnimationLoadingAccount from '@assets/web/lottie/loading-accounts.json';
import {
  View,
} from '@components/atoms';
import Lottie from '@components/atoms/lottie';
import {
  WebTitleWithDescription,
} from '@components/molecules';
import styled from 'styled-components';

import type { JSX } from "react";

const StyledContainer = styled(View)`
  row-gap: 24px;
  width: 100%;
  align-items: center;
`;

const ConnectRequestWallet = (): JSX.Element => {
  return (
    <StyledContainer>
      <View style={{
        paddingBottom: 16,
      }}
      >
        <Lottie
          speed={1}
          height={120}
          animationData={AnimationLoadingAccount}
        />
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
