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

export const RevokedContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 18px;
`;

export const RevokedChip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 22px;
  padding: 0 8px;
  border-radius: 14px;
  background: rgba(235, 84, 94, 0.1);
  color: ${getTheme('webError', '_100')};
  font-size: 10px;
  font-weight: 600;
  line-height: 18px;
  letter-spacing: 1px;
  flex-shrink: 0;

  svg {
    display: block;
    width: 12px;
    height: 12px;
  }
`;

export const RevokedDescription = styled.p`
  ${fonts.body3Reg};
  line-height: 18px;
  color: ${getTheme('neutral', '_1')};
  margin: 0;
  word-break: break-word;

  /* The design separates the two sentences by a blank line. */
  & + & {
    margin-top: 18px;
  }
`;

// Sits inline inside the sentence, so it inherits the paragraph's font and
// baseline instead of looking like a standalone button.
export const RevokedInlineButton = styled.button`
  display: inline;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  color: inherit;
  text-decoration: underline;
  text-underline-position: from-font;
  cursor: pointer;
`;
