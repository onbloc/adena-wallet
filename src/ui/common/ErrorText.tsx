import React from 'react';
import theme from '@styles/theme';
import Typography, { textVariants } from './Typography';
import styled from 'styled-components';

const Text = styled.span`
  ${textVariants.captionReg};
  width: 100%;
  padding-left: 16px;
  color: ${({ theme }) => theme.color.red[2]};
`;

export const ErrorText = ({ text }: { text: string }) => {
  return <Text>{text}</Text>;
};
