import React from 'react';
import styled, { css } from 'styled-components';

interface InputProps {
  error?: boolean;
  margin?: string;
}

export const inputStyle = css`
  ${({ theme }) => theme.fonts.body2Reg};
  width: 100%;
  height: 48px;
  background-color: ${({ theme }) => theme.color.neutral[8]};
  color: ${({ theme }) => theme.color.neutral[0]};
  border-radius: 30px;
  padding: 14px 16px;
  ::placeholder {
    color: ${({ theme }) => theme.color.neutral[9]};
  }
`;

const DefaultInput = styled.input<InputProps>`
  ${inputStyle};
  border: 1px solid ${({ error, theme }) => (error ? theme.color.red[2] : theme.color.neutral[6])};
  margin: ${({ margin }) => margin && margin};
`;

export default DefaultInput;
