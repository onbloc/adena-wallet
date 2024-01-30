import React, { ReactElement } from 'react';
import styled, { useTheme } from 'styled-components';
import _ from 'lodash';
import back from '@assets/web/chevron-left.svg';

import { Pressable, Row, View, WebImg } from '@components/atoms';

const StyledContainer = styled(Row)`
  width: 100%;
  justify-content: space-between;
  padding-bottom: 16px;
`;

const StyledDot = styled(View) <{ selected: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${({ theme, selected }): string =>
    selected ? theme.webPrimary._100 : 'rgba(0, 89, 255, 0.32)'};
`;

const StyledEmpty = styled(View)`
  width: 24px;
`;

export type WebMainHeaderProps = {
  stepLength: number;
  onClickGoBack: () => void;
  currentStep?: number;
};

export const WebMainHeader = ({
  onClickGoBack,
  currentStep,
  stepLength,
}: WebMainHeaderProps): ReactElement => {
  const theme = useTheme();

  return (
    <StyledContainer>
      <Pressable
        onClick={onClickGoBack}
        style={{ padding: 4, backgroundColor: theme.webInput._100, borderRadius: 16 }}
      >
        <WebImg src={back} size={24} />
      </Pressable>
      {stepLength > 0 && (
        <Row style={{ columnGap: 8 }}>
          {_.times(stepLength, (index) => (
            <StyledDot key={index} selected={index === currentStep} />
          ))}
        </Row>
      )}
      <StyledEmpty />
    </StyledContainer>
  );
};
