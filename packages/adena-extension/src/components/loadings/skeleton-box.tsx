import styled, { keyframes } from 'styled-components';

const pulseKeyframe = keyframes`
  to {
    background-position-x: -200%;
	}
  from {
    background-position-x: 0%;
  }
`;

export const SkeletonBoxStyle = styled.div`
  & {
    position: relative;
    background-color: ${({ theme }) => theme.color.neutral[6]};
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
    z-index: 99;
    background: linear-gradient(
      270deg,
      rgba(82, 82, 107, 0) 0%,
      rgba(123, 123, 152, 0.32) 48.44%,
      rgba(82, 82, 107, 0) 100%
    );
    background-size: 200% 100%;
    animation: ${pulseKeyframe} 1.7s linear infinite;
    content: '';
  }
`;
