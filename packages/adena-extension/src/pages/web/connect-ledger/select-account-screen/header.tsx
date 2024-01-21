import { ReactElement } from 'react';
import styled, { useTheme } from 'styled-components';
import _ from 'lodash';
import back from '@assets/web/chevron-left.svg';

import { Pressable, Row, View, WebImg } from '@components/atoms';

import useAppNavigate from '@hooks/use-app-navigate';
import { RoutePath } from '@types';

const StyledContainer = styled(Row)`
  width: 100%;
  justify-content: space-between;
`;

const StyledDot = styled(View)<{ selected: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${({ theme, selected }): string =>
    selected ? theme.webPrimary._100 : 'rgba(0, 89, 255, 0.32)'};
`;

const Header = (): ReactElement => {
  const { navigate } = useAppNavigate();
  const stepNo = 4;

  const theme = useTheme();

  return (
    <StyledContainer>
      <Pressable
        onClick={(): void => {
          navigate(RoutePath.WebConnectLedger);
        }}
        style={{ padding: 4, backgroundColor: theme.webInput._100, borderRadius: 16 }}
      >
        <WebImg src={back} size={24} />
      </Pressable>
      <Row style={{ columnGap: 8 }}>
        {_.times(5, (index) => (
          <StyledDot key={index} selected={index === stepNo} />
        ))}
      </Row>
      <View />
    </StyledContainer>
  );
};

export default Header;
