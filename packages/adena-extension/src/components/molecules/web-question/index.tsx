import React from 'react';
import { View, WebText } from '@components/atoms';
import styled, { useTheme } from 'styled-components';

const StyledContainer = styled(View)`
  row-gap: 16px;
`;

export interface WebQuestionProps {
  title: string;
  question: string;
}

export const WebQuestion: React.FC<WebQuestionProps> = ({
  title,
  question,
}) => {
  const theme = useTheme();

  return (
    <StyledContainer
      style={{
        width: '100%',
        alignItems: 'flex-start',
      }}
    >
      <WebText type='headline2' >
        {title}
      </WebText>
      <WebText type='body3' color={theme.webNeutral._300} >
        {question}
      </WebText>
    </StyledContainer>
  );
};
