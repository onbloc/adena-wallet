import React from 'react';
import styled, { keyframes } from 'styled-components';

const spinAnimation = keyframes`
  to {transform:rotate(1turn)};
`;

const SpinRing = styled.div`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'center')};
  position: relative;
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background-image: linear-gradient(0deg, #0059ff 8.53%, rgba(0, 88, 201, 0) 69.1%);
  animation: ${spinAnimation} 1.3s linear infinite;
  :before {
    content: '';
    background-color: ${({ theme }) => theme.color.neutral[7]};
    width: 36px;
    height: 36px;
    border-radius: 50%;
  }
`;

const SpinBall = styled.span`
  position: absolute;
  top: 5px;
  left: 5px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.color.primary[3]};
`;

const Spinner = () => (
  <SpinRing>
    <SpinBall />
  </SpinRing>
);

export default Spinner;
