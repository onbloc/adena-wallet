import React from 'react';
import styled from 'styled-components';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import TitleWithDesc from '@components/title-with-desc';
import Text from '@components/text';
import Icon from '@components/icons';

const text = {
  title: 'Requesting Permission',
  desc: 'Please approve the connection request\nin your browser.',
};

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  width: 100%;
  min-height: calc(100vh - 48px);
  height: auto;
  padding: 24px 20px;
  margin: 0 auto;

  div {
    text-align: center;
  }
`;

export const ConnectRequest = () => {
  return (
    <Wrapper>
      <Icon name='iconConnectLoading' />
      <TitleWithDesc title={text.title} desc={text.desc} />
      <Button fullWidth hierarchy={ButtonHierarchy.Primary} margin='auto 0px 0px'>
        <Text type='body1Bold'>Connect</Text>
      </Button>
    </Wrapper>
  );
};
