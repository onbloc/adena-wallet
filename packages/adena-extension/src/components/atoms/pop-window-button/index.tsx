import React from 'react';
import styled from 'styled-components';

import { Text } from '@components/atoms';
import mixins from '@styles/mixins';
import { getTheme } from '@styles/theme';
import IconExpand from '../icon/icon-assets/icon-expand';

interface PopWindowButtonProps {
  onClick: () => void;
}

const StyledContainer = styled.div`
  display: flex;
  position: relative;
  width: 24px;
  height: 24px;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  &:hover > .static-tooltip {
    visibility: visible;
    transition: all 0.1s ease-in-out;
    transform: scale(1);
  }
`;

const StyledIconWrapper = styled.div`
  display: flex;

  .icon-expand {
    transition: 0.2s;
    fill: ${({ theme }): string => theme.neutral.a};
  }

  &:hover .icon-expand {
    fill: ${({ theme }): string => theme.neutral._1};
  }
`;

const StyledTooltip = styled.div`
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
  right: 12px;
  transform: scale(0.6);
`;

export const PopWindowButton = ({ onClick }: PopWindowButtonProps): JSX.Element => {
  return (
    <StyledContainer>
      <StyledIconWrapper onClick={onClick}>
        <IconExpand className='icon-expand' />
      </StyledIconWrapper>
      <StyledTooltip className='static-tooltip'>
        <Text type='body3Reg'>Pop Window</Text>
      </StyledTooltip>
    </StyledContainer>
  );
};
