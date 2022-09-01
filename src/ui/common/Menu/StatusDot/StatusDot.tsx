import theme from '@styles/theme';
import Typography from '@ui/common/Typography';
import React from 'react';
import styled from 'styled-components';
import { StaticTooltip } from '../Tooltip';
interface StatusDotProps {
  status: number;
  tooltipText: string;
}

const Dot = styled.div<{ status: number }>`
  position: relative;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.color.red[2]};
  cursor: pointer;
  &:hover > .static-tooltip {
    visibility: visible;
    transition: all 0.1s ease-in-out;
    transform: scale(1);
  }
`;

export const StatusDot = ({ status, tooltipText }: StatusDotProps) => {
  return (
    <Dot status={status}>
      <StaticTooltip tooltipText={tooltipText} />
    </Dot>
  );
};
