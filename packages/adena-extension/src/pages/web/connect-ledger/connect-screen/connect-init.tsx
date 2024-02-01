import styled, { useTheme } from 'styled-components';

import IconLedger from '@assets/web/ledger.svg';
import { View, WebText, WebButton, WebImg } from '@components/atoms';

const StyledContainer = styled(View)`
  row-gap: 24px;
  width: 100%;
  align-items: flex-start;
`;

const StyledMessageBox = styled(View)`
  row-gap: 16px;
`;

const ConnectInit = ({ init }: { init: () => Promise<void> }): JSX.Element => {
  const theme = useTheme();
  return (
    <StyledContainer>
      <WebImg src={IconLedger} size={64} />
      <StyledMessageBox>
        <WebText type='headline3'>Connect a Ledger Device</WebText>
        <WebText type='body4' color={theme.webNeutral._500}>
          Connect your ledger device to your computer and make sure it is unlocked.
        </WebText>
      </StyledMessageBox>

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
