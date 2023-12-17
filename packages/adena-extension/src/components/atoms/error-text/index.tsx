import React from 'react';
import theme from '@styles/theme';
import styled from 'styled-components';
import { Text } from '../text';

const ErrorMsg = styled(Text)`
  width: 100%;
  padding-left: 16px;
`;

export const ErrorText = ({ text }: { text: string }): JSX.Element => {
  return (
    <ErrorMsg type='captionReg' color={theme.color.red[2]}>
      {text}
    </ErrorMsg>
  );
};
