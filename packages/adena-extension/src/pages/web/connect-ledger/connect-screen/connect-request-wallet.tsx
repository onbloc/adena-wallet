import styled, { useTheme } from 'styled-components';

import openCosmosGif from '@assets/web/open-cosmos.gif';
import rightSrc from '@assets/web/chevron-right.svg';

import { Row, View, WebButton, WebText } from '@components/atoms';
import WebImg from '@components/atoms/web-img';

const StyledContainer = styled(View)`
  row-gap: 24px;
  width: 552px;
  align-items: center;
`;

const StyledMessageBox = styled(View)`
  row-gap: 16px;
`;

const ConnectRequestWallet = ({ retry }: { retry: () => void }): JSX.Element => {
  const theme = useTheme();
  return (
    <StyledContainer>
      <WebImg src={openCosmosGif} height={120} />
      <StyledMessageBox>
        <WebText type='headline3'>Open Cosmos App in Ledger</WebText>
        <WebText type='body4' color={theme.webNeutral._500}>
          Make sure the Cosmos App is opened in your ledger device.
        </WebText>
      </StyledMessageBox>
      <WebButton onClick={retry} figure='primary' size='small'>
        <Row>
          <WebText type='title4'>Retry</WebText>
          <WebImg src={rightSrc} size={24} />
        </Row>
      </WebButton>
    </StyledContainer>
  );
};

export default ConnectRequestWallet;
