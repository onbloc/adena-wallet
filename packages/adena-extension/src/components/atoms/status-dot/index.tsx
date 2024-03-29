import React from 'react';
import styled from 'styled-components';

import { Text } from '@components/atoms';
import mixins from '@styles/mixins';
import { getTheme } from '@styles/theme';

interface StatusDotProps {
  status: boolean;
  tooltipText: string;
}

const Dot = styled.div<{ status: boolean }>`
  position: relative;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: ${({ status, theme }): string => (status ? theme.green._5 : theme.red._5)};
  cursor: pointer;
  &:hover > .static-tooltip {
    visibility: visible;
    transition: all 0.1s ease-in-out;
    transform: scale(1);
  }
`;

const Tooltip = styled.div`
  ${mixins.flex({ direction: 'row' })};
  width: max-content;
  height: 25px;
  visibility: hidden;
  z-index: 1;
  padding: 0px 17px;
  background-color: ${getTheme('neutral', '_9')};
  border-radius: 13px;
  position: absolute;
  right: 0px;
  top: 20px;
  transform: scale(0.6);
`;

export const StatusDot = ({ status, tooltipText }: StatusDotProps): JSX.Element => {
  return (
    <Dot status={status}>
      <Tooltip className='static-tooltip'>
        <Text type='body3Reg'>{tooltipText}</Text>
      </Tooltip>
    </Dot>
  );
};
