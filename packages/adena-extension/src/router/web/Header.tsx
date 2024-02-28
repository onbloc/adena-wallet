import { ReactElement } from 'react';
import styled, { useTheme } from 'styled-components';

import logo from '@assets/web/brand.svg';
import questionCircle from '@assets/web/question-circle.svg';

import mixins from '@styles/mixins';
import { Pressable, Row, WebText, WebImg } from '@components/atoms';
import useLink from '@hooks/use-link';
import { ADENA_HELP_PAGE } from '@common/constants/resource.constant';

const StyledContainer = styled.header`
  ${mixins.flex({ direction: 'row', justify: 'space-between' })}
  padding: 0 74px;
  height: 80px;
`;

const Header = (): ReactElement => {
  const theme = useTheme();
  const { openLink } = useLink();

  return (
    <StyledContainer>
      <WebImg src={logo} />
      <Pressable
        onClick={(): void => {
          openLink(ADENA_HELP_PAGE);
        }}
      >
        <Row style={{ columnGap: 6 }}>
          <WebImg src={questionCircle} />
          <WebText type='title4' color={theme.webNeutral._600}>
            Help
          </WebText>
        </Row>
      </Pressable>
    </StyledContainer>
  );
};

export default Header;
