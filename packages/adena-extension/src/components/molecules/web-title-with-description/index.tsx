import { View, WebText } from '@components/atoms';
import React, { CSSProperties } from 'react';
import styled, { useTheme } from 'styled-components';

const StyledContainer = styled(View)`
  row-gap: 10px;
`;

export interface WebTitleWithDescriptionProps {
  title: string;
  description: string;
  isCenter?: boolean;
  /** Keeps the title on one line even when it is wider than the column. */
  titleNoWrap?: boolean;
  marginTop?: CSSProperties['marginTop'];
  marginBottom?: CSSProperties['marginBottom'];
  descriptionLetterSpacing?: CSSProperties['letterSpacing'];
}

export const WebTitleWithDescription: React.FC<WebTitleWithDescriptionProps> = ({
  title,
  description,
  isCenter,
  titleNoWrap,
  marginTop = 0,
  marginBottom = 0,
  descriptionLetterSpacing,
}) => {
  const theme = useTheme();

  return (
    <StyledContainer
      style={{
        alignItems: isCenter ? 'center' : 'flex-start',
        marginTop,
        marginBottom,
      }}
    >
      <WebText
        type='headline2'
        textCenter={isCenter}
        style={titleNoWrap ? { whiteSpace: 'nowrap' } : undefined}
      >
        {title}
      </WebText>
      <WebText
        type='body4'
        color={theme.webNeutral._500}
        textCenter={isCenter}
        style={{ letterSpacing: descriptionLetterSpacing }}
      >
        {description}
      </WebText>
    </StyledContainer>
  );
};
