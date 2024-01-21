import styled, { useTheme } from 'styled-components';

import ledgerSrc from '@assets/web/ledger.svg';
import rightSrc from '@assets/web/chevron-right.svg';
import { View, WebText, WebButton, Row } from '@components/atoms';
import WebImg from '@components/atoms/web-img';

const StyledContainer = styled(View)`
  row-gap: 24px;
  width: 552px;
  align-items: flex-start;
`;

const StyledMessageBox = styled(View)`
  row-gap: 16px;
`;

const ConnectInit = ({ init }: { init: () => Promise<void> }): JSX.Element => {
  const theme = useTheme();
  return (
    <StyledContainer>
      <WebImg src={ledgerSrc} size={64} />
      <StyledMessageBox>
        <WebText type='headline3'>Connect a Ledger Device</WebText>
        <WebText type='body4' color={theme.webNeutral._500}>
          Connect your ledger device to your computer and make sure it is unlocked.
        </WebText>
      </StyledMessageBox>

      <WebButton onClick={init} figure='primary' size='small'>
        <Row>
          <WebText type='title4'>Connect</WebText>
          <WebImg src={rightSrc} size={24} />
        </Row>
      </WebButton>
    </StyledContainer>
  );
};

export default ConnectInit;
