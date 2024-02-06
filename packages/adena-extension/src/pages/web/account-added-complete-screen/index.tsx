import styled from 'styled-components';

import { WebMain, View, WebButton, WebImg } from '@components/atoms';

import addGif from '@assets/web/account-added.gif';
import { WebTitleWithDescription } from '@components/molecules';

const StyledContainer = styled(View)`
  row-gap: 24px;
  width: 100%;
  align-items: center;
`;

const AccountAddedCompleteScreen = (): JSX.Element => {
  const onClickDoneButton = async (): Promise<void> => {
    window.close();
  };

  return (
    <WebMain spacing={null}>
      <StyledContainer>
        <WebImg src={addGif} size={200} />
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
