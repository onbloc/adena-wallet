import { ReactElement } from 'react';
import styled, { useTheme } from 'styled-components';

import { Row, View, WebButton, WebMain, WebText } from '@components/atoms';
import useAppNavigate from '@hooks/use-app-navigate';

const StyledAbsoluteWrapper = styled(View)`
  position:absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  text-shadow: 0px 4px 80px rgba(0, 0, 0, 0.04);
  -webkit-text-stroke-width: 1;
  -webkit-text-stroke-color: #000;
  font-family: Inter;
  font-size: 480px;
  font-style: normal;
  font-weight: 600;
  line-height: 336px; /* 70% */
  letter-spacing: -14.4px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.00) 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  justify-content: center;
  align-items: center;
  overflow: hidden;
`;

const StyledContainer = styled(View)`
  width: 100%;
  align-items: center;
  justify-content: center;
  row-gap: 24px;
`;

const StyledLabel = styled(Row)`
  border-radius: 24px;
  border: 1px solid rgba(0, 89, 255, 0.08);
  background: linear-gradient(180deg, rgba(0, 89, 255, 0.24) 0%, rgba(0, 89, 255, 0.12) 100%);
  backdrop-filter: blur(8px);
  padding: 8px;
  column-gap: 4px;
`;

const NotFoundScreen = (): ReactElement => {
  const theme = useTheme();
  const { reload } = useAppNavigate();

  return (
    <WebMain>
      <StyledAbsoluteWrapper>404</StyledAbsoluteWrapper>
      <StyledContainer>
        <StyledLabel>
          <WebText type='titleOverline3' textCenter color={theme.webNeutral._300}>
            404 error
          </WebText>
        </StyledLabel>

        <View style={{ alignItems: 'center', rowGap: 8 }}>
          <WebText type='display5' textCenter>
            We can’t find this page
          </WebText>
          <WebText type='body3' textCenter color={theme.webNeutral._300}>
            The page you are looking for doesn’t exist or has been moved.
          </WebText>
        </View>
        <WebButton
          figure='tertiary'
          size='small'
          text='Go Back'
          onClick={(): void => {
            reload();
          }}
        />
      </StyledContainer>
    </WebMain>
  );
};

export default NotFoundScreen;
