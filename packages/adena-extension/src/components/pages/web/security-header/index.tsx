import React, { ReactElement } from 'react';
import styled, { useTheme } from 'styled-components';
import _ from 'lodash';

import { Pressable, Row, View, WebImg } from '@components/atoms';

import back from '@assets/web/chevron-left.svg';

const StyledContainer = styled(Row)`
  width: 100%;
  height: 32px;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
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

export type WebSecurityHeaderProps = {
  currentStep?: number;
  stepLength: number;
  visibleBackButton: boolean;
  onClickGoBack: () => void;
};

export const WebSecurityHeader = ({
  currentStep,
  stepLength,
  visibleBackButton,
  onClickGoBack,
}: WebSecurityHeaderProps): ReactElement => {
  const theme = useTheme();

  return (
    <StyledContainer>
      {visibleBackButton ? (
        <Pressable
          onClick={onClickGoBack}
          style={{ padding: 4, backgroundColor: theme.webInput._100, borderRadius: 16 }}
        >
          <WebImg src={back} size={24} />
        </Pressable>
      ) : <StyledEmpty />}

      {stepLength > 0 && (
        <Row style={{ columnGap: 8 }}>
          {_.times(stepLength, (index) => (
            <StyledDot key={index} selected={index === currentStep} />
          ))}
        </Row>
      )}

      <StyledEmpty />
    </StyledContainer >
  );
};
