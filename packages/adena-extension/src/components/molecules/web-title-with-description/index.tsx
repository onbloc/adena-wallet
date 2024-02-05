import { View, WebText } from '@components/atoms';
import React from 'react';
import styled, { useTheme } from 'styled-components';

const StyledContainer = styled(View)`
  row-gap: 10px;
`;

export interface WebTitleWithDescriptionProps {
  title: string;
  description: string;
  isCenter?: boolean;
}

export const WebTitleWithDescription: React.FC<WebTitleWithDescriptionProps> = ({
  title,
  description,
  isCenter,
}) => {
  const theme = useTheme();

  return (
    <StyledContainer style={{ alignItems: isCenter ? 'center' : 'flex-start' }}>
      <WebText type='headline2' textCenter={isCenter}>
        {title}
      </WebText>
      <WebText type='body4' color={theme.webNeutral._500} textCenter={isCenter}>
        {description}
      </WebText>
    </StyledContainer>
  );
};
