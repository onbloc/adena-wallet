import styled from 'styled-components';

export const SpinnerWrapper = styled.div<{ size: string | number }>`
  display: flex;
  flex-direction: column;
  width: ${({ size }) => (typeof size === 'number' ? `${size}px` : size)};
  height: ${({ size }) => (typeof size === 'number' ? `${size}px` : size)};

  .icon-spinner {
    width: 100%;
    height: 100%;
  }
`;
