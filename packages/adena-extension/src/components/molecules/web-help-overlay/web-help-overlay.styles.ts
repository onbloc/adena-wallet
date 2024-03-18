import styled, { keyframes } from 'styled-components';

export const WebHelpOverlayWrapper = styled.div`
  position: fixed;
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  top: 0;
  left: 0;
  z-index: 99;
  background: #00000080;
`;

const overlayItemStartAnimation = keyframes`
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
`;

const overlayItemEndAnimation = keyframes`
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
`;

export const WebHelpOverlayItemWrapper = styled.div<{ x: number; y: number }>`
  position: absolute;
  display: flex;
  flex-direction: column;
  top: ${({ y }): string => `${y}px`};
  left: ${({ x }): string => `${x}px`};
  opacity: 0;
  animation-duration: 0.4s;
  animation-timing-function: ease-in-out;
  animation-direction: alternate;
  animation-fill-mode: both;
  animation-name: ${overlayItemEndAnimation};

  &.visible {
    animation-name: ${overlayItemStartAnimation};
  }
`;
