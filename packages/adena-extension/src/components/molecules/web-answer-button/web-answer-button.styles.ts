import { Pressable } from '@components/atoms';
import { getTheme, webFonts } from '@styles/theme';
import styled, { css, RuleSet } from 'styled-components';

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
  transition: 0.2s;
  ${webFonts['body4']}

  ${({ selected }): RuleSet | string =>
    selected === false
      ? css`
          &:hover {
            background-color: rgba(255, 255, 255, 0.04);
          }
        `
      : ''}
`;

export const StyledCorrectButton = styled(StyledPressable)`
  ${({ theme, selected }): RuleSet | string =>
    selected
      ? css`
          cursor: default;
          color: ${theme.webSuccess._100};
          border-color: ${theme.webSuccess._200};
          background-color: ${theme.webSuccess._300};
        `
      : ''}
`;

export const StyledIncorrectButton = styled(StyledPressable)`
  ${({ theme, selected }): RuleSet | string =>
    selected
      ? css`
          cursor: default;
          color: ${theme.webError._100};
          border-color: ${theme.webError._200};
          background-color: ${theme.webError._300};
        `
      : ''}
`;
