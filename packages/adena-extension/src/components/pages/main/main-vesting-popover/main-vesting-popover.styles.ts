import styled from 'styled-components';

import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';

export const PopoverWrapper = styled.div<{ $caretX: number; $positionY: number }>`
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  top: ${({ $positionY }): string => `${$positionY}px`};
  width: 280px;
  padding: 14px 16px;
  background-color: ${getTheme('neutral', '_9')};
  border-radius: 8px;
  box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 99;
  overflow: visible;
  text-align: left;
  cursor: default;

  /* Caret fill, pointing back up at the balance. */
  &::after {
    content: '';
    position: absolute;
    top: -12px;
    left: ${({ $caretX }): string => `${$caretX}px`};
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-bottom: 12px solid ${getTheme('neutral', '_9')};
  }
`;

export const Header = styled.div`
  ${mixins.flex({ direction: 'row', align: 'center', justify: 'space-between' })};
  width: 100%;
  margin-bottom: 10px;
`;

export const Title = styled.span`
  ${fonts.body2Bold};
  color: ${getTheme('neutral', '_1')};
`;

export const ProgressLabel = styled.span`
  ${fonts.body3Reg};
  color: ${getTheme('neutral', 'a')};
`;

export const ProgressTrack = styled.div`
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background-color: ${getTheme('neutral', '_7')};
  overflow: hidden;
`;

export const ProgressFill = styled.div<{ $percent: number }>`
  width: ${({ $percent }): string => `${$percent}%`};
  height: 100%;
  border-radius: 2px;
  background-color: ${getTheme('primary', '_6')};
`;

export const RowList = styled.div`
  ${mixins.flex({ direction: 'column', align: 'stretch', justify: 'flex-start' })};
  width: 100%;
  margin-top: 12px;
  gap: 6px;
`;

export const Row = styled.div`
  ${mixins.flex({ direction: 'row', align: 'center', justify: 'space-between' })};
  width: 100%;
  gap: 8px;
`;

export const RowLabel = styled.span`
  ${fonts.body3Reg};
  color: ${getTheme('neutral', 'a')};
  white-space: nowrap;
`;

export const RowValue = styled.span<{ $emphasized?: boolean }>`
  ${fonts.body3Reg};
  color: ${({ $emphasized, theme }): string => ($emphasized ? theme.neutral._1 : theme.neutral._2)};
  text-align: right;
  word-break: break-all;
`;

export const Divider = styled.div`
  width: 100%;
  height: 1px;
  margin: 12px 0 10px;
  background-color: ${getTheme('neutral', '_7')};
`;

export const PeriodLabel = styled.span`
  ${fonts.body3Reg};
  display: block;
  color: ${getTheme('neutral', 'a')};
  margin-bottom: 4px;
`;

export const PeriodValue = styled.span`
  ${fonts.body3Reg};
  display: block;
  color: ${getTheme('neutral', '_1')};
`;
