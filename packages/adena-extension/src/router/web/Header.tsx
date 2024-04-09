import { ReactElement } from 'react';
import styled from 'styled-components';

import logo from '@assets/web/brand.svg';

import mixins from '@styles/mixins';
import { Pressable, Row, WebText, WebImg } from '@components/atoms';
import useLink from '@hooks/use-link';
import { ADENA_HELP_PAGE } from '@common/constants/resource.constant';
import IconQuestion from '@components/atoms/icon/icon-assets/icon-question';

const StyledContainer = styled.header`
  ${mixins.flex({ direction: 'row', justify: 'space-between' })}
  padding: 0 74px;
  height: 80px;
`;

const StyedHelpButton = styled(Pressable)`
  color: ${({ theme }): string => theme.webNeutral._600};
  transition: 0.2s;

  .icon-help path {
    transition: 0.2s;
  }

  &:hover {
    color: ${({ theme }): string => theme.webNeutral._100};

    .icon-help path {
      fill: ${({ theme }): string => theme.webNeutral._100};
    }
  }
`;

const StyedHoverText = styled(WebText)`
  color: inherit;
`;

const Header = (): ReactElement => {
  const { openLink } = useLink();

  return (
    <StyledContainer>
      <WebImg src={logo} />
      <StyedHelpButton
        onClick={(): void => {
          openLink(ADENA_HELP_PAGE);
        }}
      >
        <Row style={{ columnGap: 6 }}>
          <IconQuestion className='icon-help' />
          <StyedHoverText type='title4'>Help</StyedHoverText>
        </Row>
      </StyedHelpButton>
    </StyledContainer>
  );
};

export default Header;
