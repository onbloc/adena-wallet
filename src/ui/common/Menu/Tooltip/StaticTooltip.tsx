import Typography from '@ui/common/Typography';
import React from 'react';
import styled from 'styled-components';

interface TooltipProps {
  bgColor?: string;
  posTop?: string;
}

interface StaticTooltipProps extends TooltipProps {
  tooltipText: string;
  onClick?: () => void;
}

const Tooltip = styled.div<TooltipProps>`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'center')};
  width: max-content;
  height: 25px;
  visibility: hidden;
  z-index: 1;
  padding: 0px 17px;
  background-color: ${({ theme, bgColor }) => (bgColor ? bgColor : theme.color.primary[3])};
  border-radius: 13px;
  position: absolute;
  right: 0px;
  top: ${({ posTop }) => (posTop ? posTop : '20px')};
  transform: scale(0.6);
`;

export const StaticTooltip = ({ tooltipText, bgColor, posTop, onClick }: StaticTooltipProps) => {
  return (
    <Tooltip onClick={onClick} className='static-tooltip' bgColor={bgColor} posTop={posTop}>
      <Typography type='body2Reg'>{tooltipText}</Typography>
    </Tooltip>
  );
};
