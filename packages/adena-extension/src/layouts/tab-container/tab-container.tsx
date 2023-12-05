import React from 'react';
import styled, { CSSProp } from 'styled-components';

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
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'center', 'center')};
  width: 100vw;
  height: 100vh;
  margin-top: -48px;
  background-color: ${({ theme }): string => theme.color.neutral[8]};
`;

const Wrapper = styled.div`
  position: relative;
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'center', 'center')};
  width: 360px;
  height: 540px;
  background-color: ${({ theme }): string => theme.color.neutral[7]};
  z-index: 2;
`;
