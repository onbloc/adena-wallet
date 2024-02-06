import { ReactElement } from 'react';
import styled, { useTheme } from 'styled-components';

import Icon404 from '@assets/web/404.svg';
import IconGroup from '@assets/web/group.svg';

import { Row, View, WebButton, WebImg, WebMain, WebText } from '@components/atoms';
import useAppNavigate from '@hooks/use-app-navigate';

const StyledContainer = styled(View)`
  width: 100%;
  align-items: center;
  justify-content: center;
  background-image: url(${Icon404});
  background-repeat: no-repeat;
  background-position: center;
  height: 336px;
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
    <WebMain spacing={336} style={{ width: 931 }}>
      <StyledContainer>
        <StyledLabel>
          <WebImg src={IconGroup} size={16} />
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
