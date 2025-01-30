import styled, { css, RuleSet } from 'styled-components';

import { getTheme, webFonts } from '@styles/theme';

interface InputProps {
  width?: string;
  error?: boolean;
}

export const WebTextarea = styled.textarea<InputProps>`
  ${webFonts.body5};
  width: ${({ width }): string => width ?? 'auto'};
  color: ${getTheme('webNeutral', '_100')};
  border-radius: 12px;
  border: 1px solid;
  padding: 16px;
  border-color: ${({ theme }): string => theme.webNeutral._800};
  background-color: ${({ theme }): string => theme.webInput._100};
  outline: none;
  resize: none;

  &:placeholder-shown {
    background-color: ${({ theme }): string => theme.webNeutral._900};
  }

  ::placeholder {
    color: ${getTheme('webNeutral', '_700')};
  }

  &:focus-visible {
    box-shadow:
      0px 0px 0px 3px rgba(255, 255, 255, 0.04),
      0px 1px 3px 0px rgba(0, 0, 0, 0.1),
      0px 1px 2px 0px rgba(0, 0, 0, 0.06);
    background-color: ${({ error, theme }): string =>
      error ? theme.webError._300 : theme.webInput._100};
  }

  &:focus {
    box-shadow:
      0px 0px 0px 3px rgba(255, 255, 255, 0.04),
      0px 1px 3px 0px rgba(0, 0, 0, 0.1),
      0px 1px 2px 0px rgba(0, 0, 0, 0.06);
    background-color: ${({ error, theme }): string =>
      error ? theme.webError._300 : theme.webInput._100};
  }

  ${({ theme, error }): RuleSet | string =>
    error
      ? css`
          border-color: ${theme.webError._200};
          background-color: ${theme.webError._300};
          box-shadow:
            0px 0px 0px 3px rgba(235, 84, 94, 0.12),
            0px 1px 3px 0px rgba(0, 0, 0, 0.1),
            0px 1px 2px 0px rgba(0, 0, 0, 0.06);
        `
      : ''}
`;
