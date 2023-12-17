import React from 'react';
import styled, { CSSProp } from 'styled-components';

import { Text, Icon, Button, ButtonHierarchy } from '@components/atoms';
import { TitleWithDesc } from '@components/molecules';

const text = {
  title: 'Requesting Permission',
  desc: 'Please approve the connection request\nin your browser.',
};

const Wrapper = styled.main`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'center', 'flex-start')};
  width: 100%;
  height: 100%;
  padding: 24px 20px;
  margin: 0 auto;

  div {
    text-align: center;
  }
`;

export const ConnectRequest = (): JSX.Element => {
  return (
    <Wrapper>
      <Icon name='iconConnectLoading' />
      <TitleWithDesc title={text.title} desc={text.desc} />
      <Button disabled fullWidth hierarchy={ButtonHierarchy.Primary} margin='auto 0px 0px'>
        <Text type='body1Bold'>Connect</Text>
      </Button>
    </Wrapper>
  );
};
