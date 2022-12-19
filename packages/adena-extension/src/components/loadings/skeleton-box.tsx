import styled, { keyframes } from 'styled-components';

const pulseKeyframe = keyframes`
  to {
		transform: translateX(100%);
	}
  from {
    transform: translateX(0%);
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
    right: 100%;
    width: 200%;
    height: 100%;
    background: linear-gradient(
      270deg,
      rgba(82, 82, 107, 0) 0%,
      rgba(123, 123, 152, 0.32) 30%,
      rgba(82, 82, 107, 0) 70%,
      rgba(123, 123, 152, 0.32) 100%
    );
    animation: ${pulseKeyframe} 2s linear infinite;
    content: '';
  }
`;
