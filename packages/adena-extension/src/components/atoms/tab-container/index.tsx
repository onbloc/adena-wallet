import React from 'react';
import styled from 'styled-components';

import mixins from '@styles/mixins';
import { getTheme } from '@styles/theme';

interface Props {
  header: React.ReactNode;
  children: React.ReactNode;
}

export const TabContainer = ({ header, children }: Props): JSX.Element => {
  return (
    <Container>
      <Wrapper>
        {header}
        {children}
      </Wrapper>
    </Container>
  );
};

const Container = styled.div`
  ${mixins.flex('column', 'center', 'center')};
  width: 100vw;
  height: 100vh;
  margin-top: -48px;
  background-color: ${getTheme('neutral', '_9')};
`;

const Wrapper = styled.div`
  position: relative;
  ${mixins.flex('column', 'center', 'center')};
  width: 360px;
  height: 540px;
  background-color: ${getTheme('neutral', '_8')};
  z-index: 2;
`;
