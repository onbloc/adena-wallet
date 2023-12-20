import React from 'react';
import styled, { CSSProp } from 'styled-components';

import { Text, Button, ButtonHierarchy } from '@components/atoms';
import { TitleWithDesc } from '@components/molecules';

const text = {
  title: 'You’re All Set!',
  desc: 'Your Ledger account has been successfully added to Adena.\nPlease return to your extension.',
};

const Wrapper = styled.main`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'center', 'flex-start')};
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
      <Button
        fullWidth
        hierarchy={ButtonHierarchy.Primary}
        onClick={handleNextButtonClick}
        margin='auto 0px 0px'
      >
        <Text type='body1Bold'>Start</Text>
      </Button>
    </Wrapper>
  );
};
