import styled from 'styled-components';

import AnimationLoginFailed from '@assets/web/lottie/login-failed.json';

import { View, WebButton } from '@components/atoms';
import { WebTitleWithDescription } from '@components/molecules';
import Lottie from '@components/atoms/lottie';

const StyledContainer = styled(View)`
  row-gap: 24px;
  width: 100%;
  align-items: center;
`;

interface Props {
  retry: () => void;
}

export const ConnectFail = ({ retry }: Props): JSX.Element => {
  return (
    <StyledContainer>
      <View style={{ paddingBottom: 16 }}>
        <Lottie
          animationData={AnimationLoginFailed}
          height={120}
        />
      </View>
      <WebTitleWithDescription
        title='Connection Failed'
        description={
          'We couldn’t connect to your ledger device.\nPlease ensure that your device is unlocked.'
        }
        isCenter
        marginBottom={-6}
      />
      <WebButton
        fixed
        onClick={retry}
        figure='primary'
        size='small'
        text='Retry'
        rightIcon='chevronRight'
      />
    </StyledContainer>
  );
};

export default ConnectFail;
