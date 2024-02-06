import styled from 'styled-components';

import IconFail from '@assets/connect-fail-permission.svg';

import { View, WebButton, WebImg } from '@components/atoms';
import { WebTitleWithDescription } from '@components/molecules';

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
        <WebImg src={IconFail} size={64} />
      </View>
      <WebTitleWithDescription
        title='Connection Failed'
        description={
          'We couldn’t connect to your ledger device.\nPlease ensure that your device is unlocked.'
        }
        isCenter
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
