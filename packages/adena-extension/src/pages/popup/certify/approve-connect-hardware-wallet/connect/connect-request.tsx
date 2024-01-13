import React from 'react';
import styled from 'styled-components';

import { Text, Icon, Button } from '@components/atoms';
import { TitleWithDesc } from '@components/molecules';
import mixins from '@styles/mixins';

const text = {
  title: 'Requesting Permission',
  desc: 'Please approve the connection request\nin your browser.',
};

const Wrapper = styled.main`
  ${mixins.flex({ justify: 'flex-start' })};
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
      <Button disabled fullWidth margin='auto 0px 0px'>
        <Text type='body1Bold'>Connect</Text>
      </Button>
    </Wrapper>
  );
};
