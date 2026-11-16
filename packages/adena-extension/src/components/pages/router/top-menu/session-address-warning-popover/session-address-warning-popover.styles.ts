import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const WarningPopoverWrapper = styled.div<{ $caretX: number; $positionY: number }>`
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  top: ${({ $positionY }): string => `${$positionY}px`};
  width: 320px;
  padding: 10px 18px;
  background-color: ${getTheme('neutral', '_9')};
  border-radius: 8px;
  box-shadow: 0px 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 99;
  overflow: visible;

  .warning-text {
    ${fonts.body3Reg}
    color: ${getTheme('neutral', '_1')};
    text-align: left;
    white-space: normal;

    b {
      font-weight: 600;
    }
  }

  /* Caret fill */
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
