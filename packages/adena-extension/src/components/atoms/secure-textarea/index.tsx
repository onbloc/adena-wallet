import React from 'react';
import styled from 'styled-components';

import { fonts, getTheme } from '@styles/theme';

interface SecureTextareaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  error: boolean;
}

const StyledWrapper = styled.div<{ error: boolean }>`
  position: relative;
  width: 100%;
  height: 140px;
  border: 1px solid ${({ error, theme }): string => (error ? theme.red._5 : theme.neutral._7)};
  background-color: ${getTheme('neutral', '_9')};
  border-radius: 18px;
  overflow-y: auto;
  padding: 14px 16px 8px;
  margin-top: 20px;
`;

const StyledTextarea = styled.textarea`
  ${fonts.body2Reg};
  width: 100%;
  word-wrap: break-word;
  background-color: inherit;
  border: none;
  outline: none;
  color: white;
  resize: none;
  -webkit-text-security: disc;
`;

export const SecureTextarea = ({
  value,
  onChange,
  onKeyDown,
  error = false,
}: SecureTextareaProps): JSX.Element => {
  return (
    <StyledWrapper error={error}>
      <StyledTextarea rows={5} value={value} onChange={onChange} onKeyDown={onKeyDown} autoFocus />
    </StyledWrapper>
  );
};
