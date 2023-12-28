import React from 'react';
import styled from 'styled-components';

import IconConnectFail from '@assets/connect-fail-permission.svg';
import { TitleWithDesc } from '@components/molecules';
import mixins from '@styles/mixins';

const Container = styled.main`
  ${mixins.flex({ justify: 'flex-start' })};
`;

const Wrapper = styled.div`
  ${mixins.flex({ align: 'flex-start', justify: 'flex-start' })};
  position: relative;
  width: 100%;
  gap: 16px;
  padding-top: 35px;

  .icon {
    width: 100px;
    height: 100px;
    margin: 20px auto;
  }

  div {
    text-align: center;
  }
`;

const text = {
  title: 'Failed to load assets',
  desc: 'We couldn’t load your assets. Please\ncheck your connection with the network\nand try again.',
};

export const ErrorNetwork = (): JSX.Element => {
  return (
    <Container>
      <Wrapper>
        <img className='icon' src={IconConnectFail} alt='fail-image' />
        <TitleWithDesc title={text.title} desc={text.desc} />
      </Wrapper>
    </Container>
  );
};
