import React from 'react';
import styled from 'styled-components';
import FullButton from '@ui/common/Button/FullButton';
import TitleWithDesc from '@ui/common/TitleWithDesc';
import Typography from '@ui/common/Typography';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';

const text = {
  title: 'You’re all set!',
  desc: 'Click on the Start button to\nlaunch Adena.',
};

const Wrapper = styled.section`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'space-between')};
  width: 100%;
  height: 100%;
  padding: 50px 0px 0px;
`;

export const LaunchAdenaView = () => {
  const navigate = useNavigate();
  const handleNextButtonClick = () => navigate(RoutePath.Wallet);

  return (
    <Wrapper>
      <TitleWithDesc title={text.title} desc={text.desc} />
      <FullButton mode='primary' onClick={handleNextButtonClick} margin='auto 0px 0px'>
        <Typography type='body1Bold'>Start</Typography>
      </FullButton>
    </Wrapper>
  );
};
