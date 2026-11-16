import React from 'react';
import styled from 'styled-components';

import IconGlobe from '@assets/icon-globe';
import { fonts, getTheme } from '@styles/theme';

interface NetworkIconButtonProps {
  isConnected: boolean;
  hostname: string;
}

const StyledContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isConnected',
})<{ isConnected: boolean }>`
  display: inline-flex;
  position: relative;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  color: ${({ isConnected, theme }): string =>
    isConnected ? theme.neutral._1 : theme.neutral.a};
  cursor: default;

  &:hover > .network-tooltip {
    visibility: visible;
    opacity: 1;
  }
`;

const StyledTooltip = styled.div`
  position: absolute;
  top: calc(100% + 10px);
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 14px;
  background: ${getTheme('neutral', '_7')};
  border-radius: 10px;
  white-space: nowrap;
  z-index: 10;
  visibility: hidden;
  opacity: 0;
  transition: opacity 0.15s ease;
  pointer-events: none;

  .hostname {
    ${fonts.body2Bold};
    color: ${getTheme('neutral', '_1')};
  }

  .status {
    ${fonts.captionReg};
    color: ${getTheme('neutral', 'a')};
  }
`;

export const NetworkIconButton: React.FC<NetworkIconButtonProps> = ({
  isConnected,
  hostname,
}) => (
  <StyledContainer
    isConnected={isConnected}
    aria-label={isConnected ? `Connected to ${hostname}` : `Not connected to ${hostname}`}
  >
    <IconGlobe />
    <StyledTooltip className='network-tooltip'>
      <span className='hostname'>{hostname}</span>
      <span className='status'>{isConnected ? 'Connected' : 'Not connected'}</span>
    </StyledTooltip>
  </StyledContainer>
);

export default NetworkIconButton;
