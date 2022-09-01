import React from 'react';
import styled from 'styled-components';
import { EnglishMnemonic } from '@cosmjs/crypto';
import { textVariants } from './Typography';

interface SeedScrollBoxProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  error?: boolean;
}

const Wrapper = styled.div<{ error: boolean }>`
  width: 100%;
  height: 140px;
  border: 1px solid ${({ error, theme }) => (error ? theme.color.red[2] : theme.color.neutral[3])};
  background-color: ${({ theme }) => theme.color.neutral[8]};
  border-radius: 18px;
  overflow-y: auto;
  padding: 14px 16px 8px;
  margin-top: 20px;
`;

const Textarea = styled.textarea`
  ${textVariants.body2Reg};
  width: 100%;
  word-wrap: break-word;
  background-color: inherit;
  border: none;
  outline: none;
  color: white;
  resize: none;
`;

export const SeedScrollBox = ({ value, onChange, error = false }: SeedScrollBoxProps) => {
  return (
    <Wrapper error={error}>
      <Textarea rows={5} value={value} onChange={onChange} />
    </Wrapper>
  );
};
