import React from 'react';
import styled from 'styled-components';
import { StaticTooltip } from '../tooltips';
interface StatusDotProps {
  status: boolean;
  tooltipText: string;
}

const Dot = styled.div<{ status: boolean }>`
  position: relative;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: ${({ status, theme }): string =>
    status ? theme.color.green[2] : theme.color.red[2]};
  cursor: pointer;
  &:hover > .static-tooltip {
    visibility: visible;
    transition: all 0.1s ease-in-out;
    transform: scale(1);
  }
`;

export const StatusDot = ({ status, tooltipText }: StatusDotProps): JSX.Element => {
  return (
    <Dot status={status}>
      <StaticTooltip tooltipText={tooltipText} />
    </Dot>
  );
};
