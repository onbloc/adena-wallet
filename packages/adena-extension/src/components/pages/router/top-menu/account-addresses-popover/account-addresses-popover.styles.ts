import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const PopoverWrapper = styled.div<{ $caretX: number; $positionY: number }>`
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  top: ${({ $positionY }): string => `${$positionY}px`};
  min-width: 220px;
  background-color: ${getTheme('neutral', '_8')};
  border: 1px solid ${getTheme('neutral', '_7')};
  border-radius: 8px;
  box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 99;
  overflow: visible;

  /* Caret border (outer triangle) */
  &::before {
    content: '';
    position: absolute;
    top: -7px;
    left: ${({ $caretX }): string => `${$caretX}px`};
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 7px solid transparent;
    border-right: 7px solid transparent;
    border-bottom: 7px solid ${getTheme('neutral', '_7')};
  }

  /* Caret fill (inner triangle, same as background) */
  &::after {
    content: '';
    position: absolute;
    top: -5px;
    left: ${({ $caretX }): string => `${$caretX}px`};
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-bottom: 6px solid ${getTheme('neutral', '_8')};
  }
`;

export const ChainRow = styled.div`
  ${mixins.flex({ direction: 'row', align: 'center', justify: 'space-between' })};
  padding: 10px 12px;
  border-bottom: 1px solid ${getTheme('neutral', '_7')};
  gap: 8px;

  &:last-child {
    border-bottom: 0;
  }

  .chain-left {
    ${mixins.flex({ direction: 'row', align: 'center', justify: 'flex-start' })};
    gap: 6px;
    flex-shrink: 0;
  }

  .chain-icon {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .chain-name {
    ${fonts.captionReg}
    color: ${getTheme('neutral', '_1')};
  }

  .chain-right {
    ${mixins.flex({ direction: 'row', align: 'center', justify: 'flex-end' })};
    gap: 6px;
    flex-shrink: 0;
  }

  .address {
    ${fonts.captionReg}
    color: ${getTheme('neutral', '_3')};
    white-space: nowrap;
  }
`;
