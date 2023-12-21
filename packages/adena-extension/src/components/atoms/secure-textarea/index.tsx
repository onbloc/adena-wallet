import React from 'react';
import styled, { FlattenSimpleInterpolation } from 'styled-components';

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
  border: 1px solid
    ${({ error, theme }): string => (error ? theme.color.red[2] : theme.color.neutral[6])};
  background-color: ${({ theme }): string => theme.color.neutral[8]};
  border-radius: 18px;
  overflow-y: auto;
  padding: 14px 16px 8px;
  margin-top: 20px;
`;

const StyledTextarea = styled.textarea`
  ${({ theme }): FlattenSimpleInterpolation => theme.fonts.body2Reg};
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
