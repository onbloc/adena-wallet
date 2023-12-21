import styled, { css } from 'styled-components';

import theme, { fonts } from '@styles/theme';

interface InputProps {
  error?: boolean;
  margin?: string;
}

export const inputStyle = css`
  ${fonts.body2Reg};
  width: 100%;
  height: 48px;
  background-color: ${theme.color.neutral[8]};
  color: ${theme.color.neutral[0]};
  border-radius: 30px;
  padding: 14px 16px;
  ::placeholder {
    color: ${theme.color.neutral[9]};
  }
`;

export const DefaultInput = styled.input<InputProps>`
  ${inputStyle};
  border: 1px solid
    ${({ error, theme }): string => (error ? theme.color.red[2] : theme.color.neutral[6])};
  margin: ${({ margin }): string | undefined => margin && margin};
`;
