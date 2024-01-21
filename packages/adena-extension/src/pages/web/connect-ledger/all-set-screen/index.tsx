import styled, { useTheme } from 'styled-components';
import IconSuccessSymbol from '@assets/success-symbol.svg';

import { View, WebButton, WebMain, WebText } from '@components/atoms';
import WebImg from '@components/atoms/web-img';

const StyledContainer = styled(View)`
  row-gap: 24px;
  width: 552px;
  align-items: center;
`;

const StyledMessageBox = styled(View)`
  row-gap: 16px;
`;

const ConnectLedgerAllSet = (): JSX.Element => {
  const theme = useTheme();

  const handleNextButtonClick = (): void => {
    window.close();
  };

  return (
    <WebMain>
      <StyledContainer>
        <WebImg src={IconSuccessSymbol} size={64} />
        <StyledMessageBox>
          <WebText type='headline3' textCenter>
            You’re All Set!
          </WebText>
          <WebText type='body4' color={theme.webNeutral._500} textCenter>
            {
              'Your Ledger account has been successfully added to Adena.\nPlease return to your extension.'
            }
          </WebText>
        </StyledMessageBox>
        <WebButton figure='primary' size='small' onClick={handleNextButtonClick}>
          <WebText type='title4'>Done</WebText>
        </WebButton>
      </StyledContainer>
    </WebMain>
  );
};

export default ConnectLedgerAllSet;
