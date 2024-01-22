import styled, { useTheme } from 'styled-components';

import { WebMain, View, WebText, WebButton, WebImg, Row } from '@components/atoms';

import addGif from '@assets/web/account-added.gif';
import rightSrc from '@assets/web/chevron-right.svg';

const StyledContainer = styled(View)`
  row-gap: 24px;
  width: 552px;
  align-items: center;
`;

const StyledMessageBox = styled(View)`
  row-gap: 16px;
`;

const AccountAddedCompleteScreen = (): JSX.Element => {
  const theme = useTheme();

  const onClickDoneButton = async (): Promise<void> => {
    window.close();
  };

  return (
    <WebMain>
      <StyledContainer>
        <WebImg src={addGif} size={200} />
        <StyledMessageBox>
          <WebText type='headline3' textCenter>
            Account Added!
          </WebText>
          <WebText type='body4' color={theme.webNeutral._500} textCenter>
            {
              'You have successfully added your a new account to\nAdena! Please return to your extension to continue.'
            }
          </WebText>
        </StyledMessageBox>
        <WebButton figure='primary' size='small' onClick={onClickDoneButton}>
          <Row>
            <WebText type='title4'>Return to Extension</WebText>
            <WebImg src={rightSrc} size={24} />
          </Row>
        </WebButton>
      </StyledContainer>
    </WebMain>
  );
};

export default AccountAddedCompleteScreen;
