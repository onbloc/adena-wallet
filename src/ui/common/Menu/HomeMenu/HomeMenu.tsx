import React, { useState } from 'react';
import styled from 'styled-components';
import logo from '../../../../assets/logo-withIcon.svg';
import { DrawerMenu } from '../DrawerMenu/DrawerMenu';
import { HamburgerMenuBtn } from '@ui/common/Button/HamburgerMenuBtn';
import { useLocation } from 'react-router-dom';

const Wrapper = styled.header`
  width: 100%;
  height: 100%;
  border-bottom: 1px solid ${({ theme }) => theme.color.neutral[6]};
`;

const Header = styled.div`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'flex-start')}
  width: 100%;
  height: 100%;
  padding: 0 20px;
  position: relative;
  & > img {
    ${({ theme }) => theme.mixins.positionCenter('absolute')}
  }
`;

export const HomeMenu = ({ entry }: { entry: string }) => {
  const [open, setOpen] = useState(false);
  const toggleMenuHandler = () => setOpen(!open);
  return (
    <Wrapper>
      <Header>
        {entry !== 'approveLogin' && <HamburgerMenuBtn type='button' onClick={toggleMenuHandler} />}
        <img src={logo} alt='adena logo' />
      </Header>
      {entry !== 'approveLogin' && (
        <DrawerMenu open={open} setOpen={setOpen} onClick={toggleMenuHandler} />
      )}
    </Wrapper>
  );
};
