import React from 'react';
import styled, { keyframes } from 'styled-components';

import mixins from '@styles/mixins';
import theme from '@styles/theme';

const spinAnimation = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`;

const SpinRing = styled.div`
  ${mixins.flex('row', 'center', 'center')};
  position: relative;
  width: 70px;
  height: 70px;
  border-radius: 50%;
  background-image: linear-gradient(0deg, #0059ff 8.53%, rgba(0, 88, 201, 0) 69.1%);
  animation: ${spinAnimation} 0.9s linear infinite;
  :before {
    content: '';
    background-color: ${theme.color.neutral[7]};
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
  background-color: ${theme.color.primary[3]};
`;

export const Spinner = (): JSX.Element => (
  <SpinRing>
    <SpinBall />
  </SpinRing>
);
