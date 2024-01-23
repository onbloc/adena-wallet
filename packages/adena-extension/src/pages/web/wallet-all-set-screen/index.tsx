import styled, { useTheme } from 'styled-components';
import IconSuccessSymbol from '@assets/success-symbol.svg';

import { View, WebButton, WebMain, WebText, WebImg } from '@components/atoms';

const StyledContainer = styled(View)`
  row-gap: 24px;
  width: 552px;
  align-items: center;
`;

const StyledMessageBox = styled(View)`
  row-gap: 16px;
`;

const WalletAllSetScreen = (): JSX.Element => {
  const theme = useTheme();

  const onClickDone = (): void => {
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
        <WebButton
          figure='primary'
          size='small'
          onClick={onClickDone}
          text='Start'
          rightIcon='chevronRight'
        />
      </StyledContainer>
    </WebMain>
  );
};

export default WalletAllSetScreen;
