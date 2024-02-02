import { View, WebText } from '@components/atoms';
import { WebFontType } from '@styles/theme';
import React, { useMemo } from 'react';
import styled, { useTheme } from 'styled-components';

const StyledContainer = styled(View)`
  width: 100%;
  row-gap: 16px;
`;

interface TextOption {
  text: string;
  fontType?: WebFontType;
}

export interface WebTitleWithDescriptionProps {
  title: TextOption;
  description: TextOption;
}

const WebTitleWithDescription: React.FC<WebTitleWithDescriptionProps> = ({
  title,
  description,
}) => {
  const theme = useTheme();

  const descriptionHeight = useMemo(() => {
    return `${description.text.split('\n').length * 2 - 1}em`;
  }, [description.text]);

  return (
    <StyledContainer>
      <WebText type={title.fontType ?? 'headline2'}>{title.text}</WebText>
      <View style={{ height: descriptionHeight }}>
        <WebText
          style={{ marginTop: '-0.2em' }}
          type={description.fontType ?? 'body4'}
          color={theme.webNeutral._500}
        >
          {description.text}
        </WebText>
      </View>
    </StyledContainer>
  );
};

export default WebTitleWithDescription;