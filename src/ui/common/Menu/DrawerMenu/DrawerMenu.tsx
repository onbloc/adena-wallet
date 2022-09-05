import React, { useState } from 'react';
import styled from 'styled-components';
import logo from '../../../../assets/logo-withIcon.svg';
import cancel from '../../../../assets/cancel-large.svg';
import lock from '../../../../assets/lock.svg';
import restore from '../../../../assets/restore.svg';
import help from '../../../../assets/help-fill.svg';
import statusCheck from '../../../../assets/check-circle.svg';
import Typography from '@ui/common/Typography';
import { useMatch, useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import { useSdk } from '@services/client';

interface DrawerMenuProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onClick: (e: React.MouseEvent) => void;
}

const DrawerWrap = styled.div<{ open: boolean }>`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'space-between')}
  background-color: ${({ theme }) => theme.color.neutral[7]};
  position: fixed;
  top: 0px;
  left: ${({ open }) => (open ? '0px' : '-100%')};
  width: 270px;
  height: 100%;
  z-index: 99;
  transition: left 0.4s ease;
`;

const DrawerHeader = styled.div`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'space-between')};
  background-color: ${({ theme }) => theme.color.neutral[8]};
  padding: 0px 20px;
  width: 100%;
  height: 50px;
  & > button {
    width: 24px;
    height: 24px;
    background: url(${cancel}) no-repeat center center;
  }
`;

const DrawerFooter = styled.div`
  width: 100%;
`;

const Button = styled.button`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'flex-start')}
  width: 100%;
  height: 48px;
  padding: 0px 20px;
  background-color: ${({ theme }) => theme.color.neutral[8]};
  & + & {
    border-top: 1px solid ${({ theme }) => theme.color.neutral[6]};
  }
  & > img {
    margin-right: 12px;
  }
`;

const Overlay = styled.div<{ open: boolean }>`
  position: absolute;
  top: 0px;
  left: 0px;
  width: 100%;
  height: 100%;
  transition: 0.4s;
  background-color: rgba(255, 255, 255, 0.05);
  opacity: ${({ open }) => (open ? 1 : 0)};
  visibility: ${({ open }) => (open ? 'visible' : 'hidden')};
  -webkit-backdrop-filter: blur(20px);
  -moz-backdrop-filter: blur(20px);
  -o-backdrop-filter: blur(20px);
  backdrop-filter: blur(20px);
  z-index: 98;
`;

const DrawerBody = styled.div`
  width: 100%;
  flex-grow: 1;
  ul {
    ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
    width: 100%;
    height: auto;
    border-bottom: 1px solid ${({ theme }) => theme.color.neutral[6]};
    padding: 16px 24px 16px 20px;
  }
`;

const ListItem = styled.li`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'space-between')};
  width: 100%;
  cursor: pointer;
  & + & {
    margin-top: 12px;
  }
`;

export const DrawerMenu = ({ open, setOpen, onClick }: DrawerMenuProps) => {
  const { address, addrname } = useSdk();
  const navigate = useNavigate();
  const login = useMatch(RoutePath.Login);
  const restoreClickHandler = () => {
    setOpen(!open);
    navigate(RoutePath.EnterSeedPhrase);
  };
  const lockClickHandler = () => {
    setOpen(!open);
    chrome.storage.session.clear().then((r) => console.log('Session Storage Clear'));
    navigate(RoutePath.Login, { replace: true });
  };

  const helpSupportButtonClick = () =>
    window.open('https://docs.adena.app/resources/faq', '_blank');

  return (
    <>
      <DrawerWrap open={open}>
        <DrawerHeader>
          <img src={logo} alt='adena logo' />
          <button type='button' onClick={onClick} />
        </DrawerHeader>
        {!login && address && addrname && (
          <DrawerBody>
            <ul>
              <ListItem>
                <Typography type='body1Reg'>{`${
                  addrname[0].length > 9 ? `${addrname[0].slice(0, 9)}..` : addrname[0]
                } (${address.slice(0, 4)}..${address.slice(-4)})`}</Typography>
                <img src={statusCheck} alt='status icon' />
              </ListItem>
            </ul>
          </DrawerBody>
        )}
        <DrawerFooter>
          {login ? (
            <RestoreWallet onClick={restoreClickHandler} />
          ) : (
            <LockWallet onClick={lockClickHandler} />
          )}
          <Button onClick={helpSupportButtonClick}>
            <img src={help} alt='help and support' />
            <Typography type='body2Reg'>Help &#38; Support</Typography>
          </Button>
        </DrawerFooter>
      </DrawerWrap>
      <Overlay open={open} onClick={onClick} />
    </>
  );
};

const RestoreWallet = ({ onClick }: { onClick: () => void }) => (
  <Button onClick={onClick}>
    <img src={restore} alt='restore wallet' />
    <Typography type='body2Reg'>Restore Wallet</Typography>
  </Button>
);

const LockWallet = ({ onClick }: { onClick: () => void }) => (
  <Button onClick={onClick}>
    <img src={lock} alt='lock wallet' />
    <Typography type='body2Reg'>Lock Wallet</Typography>
  </Button>
);
