import styled, { css, FlattenSimpleInterpolation } from 'styled-components';
import { Pressable } from '@components/atoms';
import { getTheme, webFonts } from '@styles/theme';

export const StyledPressable = styled(Pressable)<{ selected: boolean }>`
  width: 100%;
  height: 44px;
  padding: 16px;
  align-items: flex-start;
  justify-content: center;
  color: ${getTheme('webNeutral', '_200')};
  border-radius: 10px;
  border: 1px solid ${getTheme('webNeutral', '_800')};
  background-color: transparent;
  ${webFonts['body4']}
`;

export const StyledCorrectButton = styled(StyledPressable)`
  ${({ theme, selected }): FlattenSimpleInterpolation | string =>
    selected
      ? css`
          color: ${theme.webSuccess._100};
          border-color: ${theme.webSuccess._200};
          background-color: ${theme.webSuccess._300};
        `
      : ''}
  &:hover {
    color: ${({ theme }): string => theme.webSuccess._100};
    border-color: ${({ theme }): string => theme.webSuccess._200};
    background-color: ${({ theme }): string => theme.webSuccess._300};
  }
`;

export const StyledIncorrectButton = styled(StyledPressable)`
  ${({ theme, selected }): FlattenSimpleInterpolation | string =>
    selected
      ? css`
          color: ${theme.webError._100};
          border-color: ${theme.webError._200};
          background-color: ${theme.webError._300};
        `
      : ''}
  &:hover {
    color: ${({ theme }): string => theme.webError._100};
    border-color: ${({ theme }): string => theme.webError._200};
    background-color: ${({ theme }): string => theme.webError._300};
  }
`;
