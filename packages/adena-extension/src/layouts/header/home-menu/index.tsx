import React, { useState } from 'react';
import styled from 'styled-components';
import logo from '../../../assets/logo-withIcon.svg';
import { HamburgerMenuBtn } from '@components/buttons/hamburger-menu-button';
import { RoutePath } from '@router/path';
import SideMenuLayout from '@layouts/side-menu-layout/side-menu-layout';
import { CSSProp } from 'styled-components';

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  border-bottom: 1px solid ${({ theme }): string => theme.color.neutral[6]};
`;

const Header = styled.div`
  ${({ theme }): CSSProp => theme.mixins.flexbox('row', 'center', 'flex-start')}
  width: 100%;
  height: 100%;
  padding: 0px 20px 0px 12px;
  position: relative;
  & > img {
    ${({ theme }): CSSProp => theme.mixins.positionCenter('absolute')}
  }
`;

export const HomeMenu = ({ entry }: { entry: string }): JSX.Element => {
  const [open, setOpen] = useState(false);
  const toggleMenuHandler = (): void => setOpen(!open);

  return (
    <Wrapper>
      <Header>
        {entry.includes('approve') && (
          <HamburgerMenuBtn type='button' disabled={true} onClick={(): void => console.log('')} />
        )}
        {!entry.includes('approve') && (
          <HamburgerMenuBtn type='button' onClick={toggleMenuHandler} />
        )}
        <img src={logo} alt='adena logo' />
      </Header>
      {entry !== RoutePath.ApproveTransaction && <SideMenuLayout open={open} setOpen={setOpen} />}
    </Wrapper>
  );
};
