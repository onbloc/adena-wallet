import React from 'react';
import { useTheme } from 'styled-components';

import { Row, WebText, WebImg } from '@components/atoms';
import IconInfo from '@assets/web/info.svg';

import { StyledContainer } from './web-warning-description-box.styles';

export interface WebWarningDescriptionBoxProps {
  description: string;
}

const WebWarningDescriptionBox: React.FC<WebWarningDescriptionBoxProps> = ({
  description,
}) => {
  const theme = useTheme();

  return (
    <StyledContainer style={{ padding: '12px 8px' }}>
      <Row style={{ alignItems: 'flex-start', gap: 4 }}>
        <WebImg src={IconInfo} size={20} />
        <WebText
          type='body6'
          style={{ letterSpacing: '-0.24px', lineHeight: '20px' }}
          color={theme.webWarning._100}
        >
          {description}
        </WebText>
      </Row>
    </StyledContainer>
  );
};

export default WebWarningDescriptionBox;