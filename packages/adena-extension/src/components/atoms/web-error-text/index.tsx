import React from 'react';
import styled, { useTheme } from 'styled-components';

import { Row } from '../base';
import IconError from '@assets/web/error.svg';
import { WebImg } from '../web-img';
import { WebText } from '../web-text';

const StyledText = styled(WebText)`
  width: 100%;
`;

export const WebErrorText = ({ text }: { text: string }): JSX.Element => {
  const theme = useTheme();
  return (
    <Row style={{ gap: 6 }}>
      <WebImg src={IconError} size={20} />
      <StyledText type='body5' color={theme.webError._100}>
        {text}
      </StyledText>
    </Row>
  );
};
