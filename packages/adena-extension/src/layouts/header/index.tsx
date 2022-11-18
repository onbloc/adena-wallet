import React, { useEffect } from 'react';
import styled from 'styled-components';
import { Route, useLocation, useMatch } from 'react-router-dom';
import { RoutePath } from '@router/path';
import { HomeMenu } from './home-menu';
import { TopMenu } from './top-menu';
import { ProgressMenu } from './progress-menu';
import ApproveMenu from './approve-menu';

const Wrapper = styled.header`
  width: 100%;
  height: 48px;
  background-color: ${({ theme }) => theme.color.neutral[7]};
  position: sticky;
  top: 0px;
  z-index: 2;
`;

export const Header = () => {
  const location = useLocation();
  const login = useMatch(RoutePath.Login);
  const approveEstablish = useMatch(RoutePath.ApproveEstablish);
  const approveTransactionLogin = useMatch(RoutePath.ApproveTransactionLogin);
  const approveTransaction = useMatch(RoutePath.ApproveTransaction);
  const wallet = useMatch('/wallet/*');
  const nft = useMatch(RoutePath.Nft);

  const explore = useMatch(RoutePath.Explore);
  const history = useMatch(RoutePath.History);
  const settings = useMatch('/settings/*');
  const connectedApps = useMatch(RoutePath.ConnectedApps);
  const changeNetwork = useMatch(RoutePath.ChangeNetwork);

  const enterSeedPhrase = useMatch(RoutePath.EnterSeedPhrase);
  const yourSeedPhrase = useMatch(RoutePath.YourSeedPhrase);
  const createPassword = useMatch(RoutePath.CreatePassword);
  const launchAdena = useMatch(RoutePath.LaunchAdena);

  return (
    <Wrapper>
      {(login || approveTransactionLogin) && <HomeMenu entry={location.pathname as string} />}
      {(approveEstablish || approveTransaction) && <ApproveMenu />}
      {(wallet ||
        settings ||
        nft ||
        explore ||
        history ||
        connectedApps ||
        changeNetwork) && <TopMenu />}
      {(yourSeedPhrase || enterSeedPhrase) && <ProgressMenu progressLevel={'first'} />}
      {createPassword && <ProgressMenu progressLevel={'second'} />}
      {launchAdena && <ProgressMenu progressLevel={'third'} />}
    </Wrapper>
  );
};
