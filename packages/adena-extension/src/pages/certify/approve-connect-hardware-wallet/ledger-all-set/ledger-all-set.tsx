import React from 'react';
import styled from 'styled-components';

import { Text, Button } from '@components/atoms';
import { TitleWithDesc } from '@components/molecules';
import mixins from '@styles/mixins';

const text = {
  title: 'You’re All Set!',
  desc: 'Your Ledger account has been successfully added to Adena.\nPlease return to your extension.',
};

const Wrapper = styled.main`
  ${mixins.flex('column', 'center', 'flex-start')};
  max-width: 380px;
  padding-top: 50px;
`;

export const ApproveHardwareWalletLedgerAllSet = (): JSX.Element => {
  const handleNextButtonClick = (): void => {
    window.close();
  };

  return (
    <Wrapper>
      <TitleWithDesc title={text.title} desc={text.desc} />
      <Button fullWidth onClick={handleNextButtonClick} margin='auto 0px 0px'>
        <Text type='body1Bold'>Start</Text>
      </Button>
    </Wrapper>
  );
};
