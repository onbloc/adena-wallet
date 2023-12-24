import React from 'react';
import styled, { useTheme } from 'styled-components';

import { Text } from '../text';

const ErrorMsg = styled(Text)`
  width: 100%;
  padding-left: 16px;
`;

export const ErrorText = ({ text }: { text: string }): JSX.Element => {
  const theme = useTheme();
  return (
    <ErrorMsg type='captionReg' color={theme.red._5}>
      {text}
    </ErrorMsg>
  );
};
