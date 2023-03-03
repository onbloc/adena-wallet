import React from 'react';
import styled from 'styled-components';

interface Props {
  header: React.ReactNode;
  children: React.ReactNode;
}

export const TabContainer = ({ header, children }: Props) => {
  return (
    <Container>
      <Wrapper>
        {header}
        {children}
      </Wrapper>
    </Container>
  )
};

const Container = styled.div`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'center')};
  width: 100vw;
  height: 100vh;
  margin-top: -48px;
  background-color: ${({ theme }) => theme.color.neutral[8]};
`;

const Wrapper = styled.div`
  position: relative;
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'center')};
  width: 360px;
  height: 540px;
  background-color: ${({ theme }) => theme.color.neutral[7]};
  z-index: 2;
`;