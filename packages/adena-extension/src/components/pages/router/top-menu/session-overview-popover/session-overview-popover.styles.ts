import { fonts, getTheme } from '@styles/theme';
import styled from 'styled-components';

export const PopoverWrapper = styled.div<{ $caretRight: number; $positionY: number }>`
  position: fixed;
  right: 16px;
  top: ${({ $positionY }): string => `${$positionY}px`};
  width: 320px;
  background-color: ${getTheme('neutral', '_9')};
  border-radius: 12px;
  box-shadow: 0px 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 99;
  overflow: visible;

  &::after {
    content: '';
    position: absolute;
    top: -12px;
    right: ${({ $caretRight }): string => `${Math.max(8, $caretRight)}px`};
    transform: translateX(50%);
    width: 0;
    height: 0;
    border-left: 10px solid transparent;
    border-right: 10px solid transparent;
    border-bottom: 12px solid ${getTheme('neutral', '_9')};
  }
`;

export const ScrollContainer = styled.div`
  max-height: 440px;
  overflow-y: auto;
  padding: 16px 0;
  border-radius: 12px;

  scrollbar-width: thin;
  scrollbar-color: ${getTheme('neutral', '_6')} transparent;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${getTheme('neutral', '_6')};
    border-radius: 3px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
`;

export const Title = styled.h3`
  ${fonts.body2Bold};
  color: ${getTheme('neutral', '_1')};
  padding: 0 18px 12px;
  margin: 0;
`;
