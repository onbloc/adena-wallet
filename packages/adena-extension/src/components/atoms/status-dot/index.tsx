import React, { useMemo, useRef } from 'react';
import styled from 'styled-components';

import { Text } from '@components/atoms';
import mixins from '@styles/mixins';
import { getTheme } from '@styles/theme';
import IconConnected from '../icon/icon-assets/icon-connected';

interface StatusDotProps {
  status: boolean;
  tooltipText: string;
}

const StyledContainer = styled.div<{ status: boolean }>`
  display: ${({ status }): string => (status ? 'flex' : 'none')};
  position: relative;
  width: 15px;
  height: 15px;
  cursor: pointer;
  &:hover > .static-tooltip {
    visibility: visible;
    transition: all 0.1s ease-in-out;
    transform: scale(1);
  }
`;

const StyledTooltip = styled.div<{ descriptionSize: number }>`
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

export const StatusDot = ({ status, tooltipText }: StatusDotProps): JSX.Element => {
  const descriptionContainer = useRef<HTMLDivElement>(null);

  const descriptionSize = useMemo(() => {
    return descriptionContainer.current?.clientWidth || 0;
  }, [descriptionContainer.current?.clientWidth, tooltipText]);

  return (
    <StyledContainer status={status}>
      <IconConnected />
      <StyledTooltip
        ref={descriptionContainer}
        className='static-tooltip'
        descriptionSize={descriptionSize}
      >
        <Text type='body3Reg'>{tooltipText}</Text>
      </StyledTooltip>
    </StyledContainer>
  );
};
