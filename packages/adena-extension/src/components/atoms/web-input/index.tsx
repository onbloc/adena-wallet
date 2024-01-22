import styled from 'styled-components';

import { webFonts, getTheme } from '@styles/theme';

interface InputProps {
  error?: boolean;
}

export const WebInput = styled.input<InputProps>`
  ${webFonts.body5};
  color: ${getTheme('webNeutral', '_0')};
  border-radius: 12px;
  border: 1px solid;
  border-color: ${getTheme('webNeutral', '_800')};
  padding: 12px 16px;
  ${({ error, theme }): string => (error ? theme.webError._200 : theme.webNeutral._800)};
  background-color: transparent;

  ::placeholder {
    color: ${getTheme('webNeutral', '_700')};
  }
  :focus {
    box-shadow: 0px 0px 0px 3px rgba(255, 255, 255, 0.04), 0px 1px 3px 0px rgba(0, 0, 0, 0.1),
      0px 1px 2px 0px rgba(0, 0, 0, 0.06);
  }
  :focus-visible {
    outline: none;
    box-shadow: 0px 0px 0px 3px rgba(255, 255, 255, 0.04), 0px 1px 3px 0px rgba(0, 0, 0, 0.1),
      0px 1px 2px 0px rgba(0, 0, 0, 0.06);
    background-color: #181b1f;
  }
`;
