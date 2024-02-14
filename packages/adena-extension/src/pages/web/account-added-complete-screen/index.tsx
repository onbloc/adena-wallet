import styled from 'styled-components';

import { WebMain, View, WebButton } from '@components/atoms';

import AnimationAddAccount from '@assets/web/lottie/account-added.json';
import { WebTitleWithDescription } from '@components/molecules';
import Lottie from '@components/atoms/lottie';

const StyledContainer = styled(View)`
  row-gap: 18px;
  width: 100%;
  align-items: center;
`;

const AccountAddedCompleteScreen = (): JSX.Element => {
  const onClickDoneButton = async (): Promise<void> => {
    window.close();
  };

  return (
    <WebMain spacing={null} style={{ alignItems: 'center' }}>
      <View style={{ paddingBottom: 16, marginTop: -80 }}>
        <Lottie
          speed={1}
          height={200}
          animationData={AnimationAddAccount}
        />
      </View>
      <StyledContainer>
        <WebTitleWithDescription
          title='Account Added!'
          description={
            'You have successfully added your a new account to\nAdena! Please return to your extension to continue.'
          }
          isCenter
        />
        <WebButton
          figure='primary'
          size='small'
          onClick={onClickDoneButton}
          text='Return to Extension'
          rightIcon='chevronRight'
        />
      </StyledContainer>
    </WebMain>
  );
};

export default AccountAddedCompleteScreen;
