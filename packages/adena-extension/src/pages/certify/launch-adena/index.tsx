import React from 'react';
import styled from 'styled-components';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import TitleWithDesc from '@components/title-with-desc';
import Text from '@components/text';
import { useLocation, useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import { useLoadAccounts } from '@hooks/use-load-accounts';

const text = {
  title: 'You’re All Set',
  desc: 'Click on the Start button to\nlaunch Adena.',
};

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'space-between')};
  width: 100%;
  height: 100%;
  padding-top: 50px;
`;

interface LaunchAdenaState {
  type: 'SEED' | 'LEDGER' | 'GOOGLE' | 'NONE';
}

export const LaunchAdena = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { loadAccounts } = useLoadAccounts();

  const handleNextButtonClick = () => {
    const locationState: LaunchAdenaState = location.state;
    if (locationState.type === 'GOOGLE' || locationState.type === 'LEDGER') {
      window.close();
    }
    if (locationState.type === 'SEED') {
      loadAccounts();
      navigate(RoutePath.Wallet);
      return;
    }
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
