import React from 'react';
import styled from 'styled-components';
import Text from '@components/text';

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
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'center')};
  width: 171px;
  height: auto;
  visibility: hidden;
  z-index: 1;
  background-color: ${({ theme, bgColor }) => (bgColor ? bgColor : theme.color.neutral[8])};
  border-radius: 13px;
  position: absolute;
  right: 0px;
  top: ${({ posTop }) => (posTop ? posTop : '20px')};
  transform: scale(0.6);
  display: flex;
  flex-direction: column;

  & > * {
    width: 100%;
    height: 26px;
    padding: 2px 25px;
    border-bottom: 1px solid ${({ theme }) => theme.color.neutral[9]};

    &:last-child {
      border-bottom: none;
    }
  }
`;

export const StaticMultiTooltip = ({ bgColor, posTop, items }: StaticTooltipProps) => {
  return (
    <Tooltip className='static-tooltip' bgColor={bgColor} posTop={posTop}>
      {
        items.map((item, index) => (
          <Text
            key={index}
            type='body3Reg'
            textAlign='center'
            onClick={item.onClick}
          >
            {item.tooltipText}
          </Text>
        )
        )
      }
    </Tooltip>
  );
};
