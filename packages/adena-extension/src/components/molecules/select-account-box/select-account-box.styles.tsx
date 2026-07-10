import { Row, View } from '@components/atoms';
import { getTheme, webFonts } from '@styles/theme';
import styled, { keyframes } from 'styled-components';

export const StyledSelectAccountBox = styled(View)`
  row-gap: 8px;
`;

export const StyledSelectAccountContent = styled(View)`
  display: block;
  width: 552px;
  max-height: 266px;
  overflow-y: auto;
  background-color: #14161a;
  border-radius: 12px;

  ::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera*/
  }
`;

export const StyledActionRow = styled(Row)`
  justify-content: center;
  align-items: center;
  gap: 12px;
`;

// Pill action button ("Load more accounts" / "Set Derivation Path").
// Fixed width so the size never changes with the label (e.g. "Loading").
// Resting: dark border, no fill. Hover (enabled only): #181B1F fill.
export const StyledActionButton = styled.button<{ $width: number }>`
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: ${({ $width }): string => `${$width}px`};
  height: 32px;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid #212429;
  background-color: transparent;
  white-space: nowrap;
  cursor: pointer;

  &:hover:not(:disabled) {
    background-color: #181b1f;
  }

  &:disabled {
    cursor: not-allowed;
  }
`;

// Button label: gray by default, white when the (enabled) button is hovered.
export const StyledActionLabel = styled.span`
  ${webFonts.title6}
  white-space: nowrap;
  color: ${getTheme('webNeutral', '_500')};

  ${StyledActionButton}:hover:not(:disabled) & {
    color: ${getTheme('webNeutral', '_100')};
  }
`;

export const KeyframeRotate = keyframes`
  from {
    -webkit-transform: rotate(0deg);
    -o-transform: rotate(0deg);
    transform: rotate(0deg);
  }
  to {
    -webkit-transform: rotate(360deg);
    -o-transform: rotate(360deg);
    transform: rotate(360deg);
  }
`;

export const StyledLoadingWrapper = styled(View)`
  justify-content: center;
  align-items: center;
  animation: ${KeyframeRotate} 1.5s infinite;
`;
