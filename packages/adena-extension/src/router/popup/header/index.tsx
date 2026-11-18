import { useNetwork } from '@hooks/use-network';
import { WalletState } from '@states';
import { getTheme } from '@styles/theme';
import { RoutePath } from '@types';
import { useAtom } from 'jotai';
import type { JSX } from 'react';
import React from 'react';
import { useLocation, useMatch } from 'react-router';
import styled from 'styled-components';

import ApproveMenu from './approve-menu';
import { ArrowTitleMenu } from './arrow-title-menu';
import { CloseTitleMenu } from './close-title-menu';
import { HomeMenu } from './home-menu';
import { ProgressMenu } from './progress-menu';
import { TabMenu } from './tab-menu';
import { TopMenu } from './top-menu';

const Wrapper = styled.header`
  display: flex;
  flex-shrink: 0;
  width: 100%;
  height: 50px;
  background-color: ${getTheme('neutral', '_8')};
  /* Pinned to the viewport so scroll/overscroll on any nested container
     never drags the header. Companion: #popup reserves 50px padding-top
     in global-style.ts so this overlay does not cover page content. */
  position: fixed;
  top: 0px;
  left: 0px;
  right: 0px;
  z-index: 20;
`;

export const Header = (): JSX.Element => {
  const location = useLocation();
  const login = useMatch(RoutePath.Login);
  const approveEstablish = useMatch(RoutePath.ApproveEstablish);
  const ApproveLogin = useMatch(RoutePath.ApproveLogin);
  const approveSign = useMatch(RoutePath.ApproveSign);
  const approveTransaction = useMatch(RoutePath.ApproveTransaction);
  const approveSignFailed = useMatch(RoutePath.ApproveSignFailed);
  const approveEstablishCosmos = useMatch(RoutePath.ApproveEstablishCosmos);
  const approveSignArbitrary = useMatch(RoutePath.ApproveSignArbitrary);
  const approveSignCosmos = useMatch(RoutePath.ApproveSignCosmos);
  const approveGetCosmosKey = useMatch(RoutePath.ApproveGetCosmosKey);
  const wallet = useMatch('/wallet/*');
  const nft = useMatch(RoutePath.Nft);

  const explore = useMatch(RoutePath.Explore);
  const history = useMatch(RoutePath.History);
  const settings = useMatch('/settings/*');
  const connectedApps = useMatch(RoutePath.ConnectedApps);
  const changeNetwork = useMatch(RoutePath.ChangeNetwork);

  const accountDetails = useMatch(RoutePath.AccountDetails);
  const manageSessions = useMatch(RoutePath.ManageSessions);
  const revokeSession = useMatch(RoutePath.RevokeSession);
  const revokeAllSessions = useMatch(RoutePath.RevokeAllSessions);
  const enterSeedPhrase = useMatch(RoutePath.EnterSeedPhrase);
  const createPassword = useMatch(RoutePath.CreatePassword);
  const launchAdena = useMatch(RoutePath.LaunchAdena);

  const forgotPassword = useMatch(RoutePath.ForgotPassword);
  const resetWallet = useMatch(RoutePath.ResetWallet);
  const approveHardwareWalletConnect = useMatch(RoutePath.WebConnectLedger);
  const approveHardwareWalletSelectAccount = useMatch(RoutePath.WebConnectLedgerSelectAccount);

  const [walletState] = useAtom(WalletState.state);
  const { failedNetwork } = useNetwork();

  const loadingComplete = walletState === 'FINISH' || failedNetwork !== null;
  const renderHeader = (): JSX.Element | undefined => {
    if (login || ApproveLogin) {
      return <HomeMenu entry={location.pathname as string} />;
    }
    if (enterSeedPhrase) {
      if (location?.state?.type === 'ADD_ACCOUNT') {
        return <ArrowTitleMenu />;
      }
      return <ProgressMenu progressLevel='first' />;
    }
    if (
      approveEstablish
      || approveTransaction
      || approveSign
      || approveSignFailed
      || approveEstablishCosmos
      || approveSignArbitrary
      || approveSignCosmos
      || approveGetCosmosKey
    ) {
      return <ApproveMenu />;
    }
    if (createPassword) {
      return <ProgressMenu progressLevel='second' />;
    }
    if (launchAdena) {
      return <ProgressMenu progressLevel='third' hideArrow />;
    }
    if (forgotPassword) {
      return <ArrowTitleMenu title='Forgot Password?' />;
    }
    if (approveHardwareWalletConnect || approveHardwareWalletSelectAccount) {
      return <TabMenu />;
    }
    if (resetWallet) {
      return location?.state?.from === 'forgot-password'
        ? (
            <ArrowTitleMenu title='Reset Wallet' />
          )
        : (
            <TopMenu />
          );
    }

    if (accountDetails) {
      return <CloseTitleMenu title='Account Details' />;
    }

    if (revokeSession || revokeAllSessions) {
      return <ArrowTitleMenu title='Revoking Session' />;
    }

    if (manageSessions) {
      return <ArrowTitleMenu title='Session Accounts' />;
    }

    if (
      wallet
      || nft
      || explore
      || history
      || settings
      || connectedApps
      || changeNetwork
      || loadingComplete
    ) {
      return <TopMenu />;
    }
  };

  return <Wrapper>{renderHeader()}</Wrapper>;
};
