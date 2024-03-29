import React from 'react';
import styled from 'styled-components';

import { Text } from '@components/atoms';
import mixins from '@styles/mixins';
import { getTheme } from '@styles/theme';

interface TooltipProps {
  bgColor?: string;
  posTop?: string;
}

interface StaticTooltipProps extends TooltipProps {
  items: {
    tooltipText: string;
    onClick: () => void;
  }[];
}

const Tooltip = styled.div<TooltipProps>`
  ${mixins.flex()};
  width: 171px;
  height: auto;
  visibility: hidden;
  z-index: 1;
  background-color: ${({ theme, bgColor }): string => (bgColor ? bgColor : theme.neutral._9)};
  border-radius: 13px;
  position: absolute;
  right: 0px;
  top: ${({ posTop }): string => (posTop ? posTop : '20px')};
  transform: scale(0.6);

  & > * {
    width: 100%;
    height: 26px;
    padding: 2px 25px;
    border-bottom: 1px solid ${getTheme('neutral', 'a')};

    &:last-child {
      border-bottom: none;
    }
  }
`;

export const StaticMultiTooltip = ({ bgColor, posTop, items }: StaticTooltipProps): JSX.Element => {
  return (
    <Tooltip className='static-tooltip' bgColor={bgColor} posTop={posTop}>
      {items.map((item, index) => (
        <Text key={index} type='body3Reg' textAlign='center' onClick={item.onClick}>
          {item.tooltipText}
        </Text>
      ))}
    </Tooltip>
  );
};
