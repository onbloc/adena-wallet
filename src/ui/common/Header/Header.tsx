import React from 'react';
import styled from 'styled-components';
import { Route, useLocation, useMatch } from 'react-router-dom';
import { RoutePath } from '@router/path';
import { HomeMenu } from '../Menu/HomeMenu';
import { TopMenu } from '../Menu/TopMenu';
import { ProgressMenu } from '../Menu/ProgressMenu';

const Wrapper = styled.header`
  width: 100%;
  height: 48px;
  background-color: ${({ theme }) => theme.color.neutral[7]};
`;

export const Header = () => {
  const location = useLocation();
  const login = useMatch(RoutePath.Login);
  const ApproveTransactionLogin = useMatch(RoutePath.ApproveTransactionLogin);

  const wallet = useMatch('/wallet/*');

  const nft = useMatch(RoutePath.Nft);

  const staking = useMatch(RoutePath.Staking);
  const history = useMatch(RoutePath.History);
  const settings = useMatch('/settings/*');

  const addAccount = useMatch(RoutePath.SideBarAddAccount);
  const importAccount = useMatch(RoutePath.SideBarImportAccount);

  const enterSeedPhrase = useMatch(RoutePath.EnterSeedPhrase);
  const yourSeedPhrase = useMatch(RoutePath.YourSeedPhrase);
  const createPassword = useMatch(RoutePath.CreatePassword);
  const lauchAdena = useMatch(RoutePath.LaunchAdena);
  return (
    <Wrapper>
      {(login || ApproveTransactionLogin) && (
        // @ts-ignore
        <HomeMenu entry={location.state as string} />
      )}
      {(importAccount || wallet || settings || addAccount || nft || staking || history) && (
        <TopMenu />
      )}
      {(yourSeedPhrase || enterSeedPhrase) && <ProgressMenu progressLevel={'first'} />}
      {createPassword && <ProgressMenu progressLevel={'second'} />}
      {lauchAdena && <ProgressMenu progressLevel={'third'} />}
    </Wrapper>
  );
};
