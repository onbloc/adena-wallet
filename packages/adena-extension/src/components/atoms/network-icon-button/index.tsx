import React, { useMemo, useRef } from 'react';
import styled from 'styled-components';

import IconGlobe from '@assets/icon-globe';
import { Text } from '@components/atoms/text';
import mixins from '@styles/mixins';
import { getTheme } from '@styles/theme';

interface NetworkIconButtonProps {
  isConnected: boolean;
  tooltipText: string;
}

const StyledContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isConnected',
})<{ isConnected: boolean }>`
  display: ${({ isConnected }): string => (isConnected ? 'inline-flex' : 'none')};
  position: relative;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  color: ${getTheme('neutral', '_1')};
  cursor: default;

  &:hover > .static-tooltip {
    visibility: visible;
    transition: all 0.1s ease-in-out;
    transform: scale(1);
  }
`;

const StyledTooltip = styled.div.withConfig({
  shouldForwardProp: (prop) => !['descriptionSize'].includes(prop),
})<{ descriptionSize: number }>`
  position: fixed;
  ${mixins.flex({ direction: 'row' })};
  width: max-content;
  height: 25px;
  visibility: hidden;
  z-index: 1;
  padding: 0px 17px;
  background-color: ${getTheme('neutral', '_9')};
  border-radius: 13px;
  top: 40px;
  left: ${({ descriptionSize }): string => `calc(50% - ${descriptionSize / 2}px)`};
  transform: scale(0.6);
`;

export const NetworkIconButton: React.FC<NetworkIconButtonProps> = ({
  isConnected,
  tooltipText,
}) => {
  const descriptionContainer = useRef<HTMLDivElement>(null);

  const descriptionSize = useMemo(() => {
    return descriptionContainer.current?.clientWidth || 0;
  }, [descriptionContainer.current?.clientWidth, tooltipText]);

  return (
    <StyledContainer isConnected={isConnected} aria-label={tooltipText}>
      <IconGlobe />
      <StyledTooltip
        ref={descriptionContainer}
        className='static-tooltip'
        descriptionSize={descriptionSize}
      >
        <Text type='body3Reg' color='#FFFFFF'>
          {tooltipText}
        </Text>
      </StyledTooltip>
    </StyledContainer>
  );
};

export default NetworkIconButton;
