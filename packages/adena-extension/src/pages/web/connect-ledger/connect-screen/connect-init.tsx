import styled from 'styled-components';

import IconLedger from '@assets/web/ledger.svg';
import { View, WebButton, WebImg } from '@components/atoms';
import { WebTitleWithDescription } from '@components/molecules';

const StyledContainer = styled(View)`
  row-gap: 24px;
  width: 100%;
  align-items: flex-start;
`;

const ConnectInit = ({ init }: { init: () => Promise<void> }): JSX.Element => {
  return (
    <StyledContainer>
      <View style={{ rowGap: 36 }}>
        <WebImg src={IconLedger} size={88} />
        <WebTitleWithDescription
          title='Connect a Ledger Device'
          description={'Connect your ledger device to your computer and make sure it is\nunlocked.'}
        />
      </View>

      <WebButton
        onClick={init}
        figure='primary'
        size='small'
        text='Connect'
        rightIcon='chevronRight'
      />
    </StyledContainer>
  );
};

export default ConnectInit;
