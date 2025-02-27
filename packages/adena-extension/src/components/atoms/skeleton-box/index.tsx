import { getTheme } from '@styles/theme';
import styled, { keyframes } from 'styled-components';

const pulseKeyframe = keyframes`
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(50%);
  }
  100% {
    transform: translateX(130%);
  }
`;

export const SkeletonBoxStyle = styled.div`
  & {
    position: relative;
    background-color: ${getTheme('neutral', '_7')};
    border-radius: 18px;
    padding: 0px 17px 0px 14px;
    overflow: hidden;
  }

  &::after {
    position: absolute;
    display: inline-block;
    top: 0;
    right: 0;
    width: 100%;
    height: 100%;
    z-index: 8;
    background: linear-gradient(
      270deg,
      rgba(82, 82, 107, 0) 0%,
      rgba(123, 123, 152, 0.32) 50%,
      rgba(82, 82, 107, 0) 100%
    );
    background-size: 100% 100%;
    animation: ${pulseKeyframe} 1.5s linear infinite;
    content: '';
  }
`;
