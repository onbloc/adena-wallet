import styled from 'styled-components';
import { Pressable, View, WebText } from '@components/atoms';

export const StyledContainer = styled(View)`
  width: 100%;
  row-gap: 16px;
`;

export const StyledAddButton = styled(Pressable)<{ isDisabled: boolean }>`
  display: flex;
  width: 128px;
  height: 32px;
  padding: 8px 16px;
  justify-content: center;
  align-items: center;
  gap: 4px;
  border-radius: 8px;
  background: ${({ isDisabled }): string =>
    isDisabled ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.12)'};
  position: relative;
  transition: all 0.2s;
  cursor: ${({ isDisabled }): string => (isDisabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ isDisabled }): string => (isDisabled ? '0.5' : '1')};
  pointer-events: ${({ isDisabled }): string => (isDisabled ? 'none' : 'auto')};

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 8px;
    padding: 1px;
    background: ${({ isDisabled }): string =>
      isDisabled
        ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0) 100%)'
        : 'linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0) 100%)'};
    -webkit-mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
  }

  &:hover {
    background: ${({ isDisabled }): string =>
      isDisabled ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.2)'};
  }
`;

export const StyledCloseButton = styled.button`
  display: inline-flex;
  width: 14px;
  height: 14px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;

  svg {
    width: 100%;
    height: 100%;

    line {
      transition: 0.2s;
      stroke: ${({ theme }): string => theme.webNeutral._500};
    }
  }

  &:hover {
    svg {
      line {
        stroke: ${({ theme }): string => theme.webNeutral._100};
      }
    }
  }
`;

export const StyledButtonText = styled(WebText)<{ isDisabled: boolean }>`
  color: ${({ theme, isDisabled }): string =>
    isDisabled ? theme.webNeutral._500 : theme.webNeutral._100};
  font-family: Inter;
  font-size: 12px;
  font-style: normal;
  font-weight: 600;
  line-height: 16px;
  letter-spacing: -0.12px;
`;

export const StyledInputRow = styled(View)`
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  gap: 8px;
`;
