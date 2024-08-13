import React from 'react';
import styled from 'styled-components';
import { useLocation, useMatch } from 'react-router-dom';
import { useRecoilState } from 'recoil';

import { RoutePath } from '@types';
import { WalletState } from '@states';
import { useNetwork } from '@hooks/use-network';
import { getTheme } from '@styles/theme';

import { HomeMenu } from './home-menu';
import { TopMenu } from './top-menu';
import { ProgressMenu } from './progress-menu';
import ApproveMenu from './approve-menu';
import { ArrowTitleMenu } from './arrow-title-menu';
import { TabMenu } from './tab-menu';
import { CloseTitleMenu } from './close-title-menu';

const Wrapper = styled.header`
  display: flex;
  flex-shrink: 0;
  width: 100%;
  height: 70px;
  background-color: ${getTheme('neutral', '_8')};
  position: sticky;
  top: 0px;
  z-index: 2;
`;

export const Header = (): JSX.Element => {
  const location = useLocation();
  const login = useMatch(RoutePath.Login);
  const approveEstablish = useMatch(RoutePath.ApproveEstablish);
  const ApproveLogin = useMatch(RoutePath.ApproveLogin);
  const approveSign = useMatch(RoutePath.ApproveSign);
  const approveTransaction = useMatch(RoutePath.ApproveTransaction);
  const approveSignFailed = useMatch(RoutePath.ApproveSignFailed);
  const wallet = useMatch('/wallet/*');
  const nft = useMatch(RoutePath.Nft);

  const explore = useMatch(RoutePath.Explore);
  const history = useMatch(RoutePath.History);
  const settings = useMatch('/settings/*');
  const connectedApps = useMatch(RoutePath.ConnectedApps);
  const changeNetwork = useMatch(RoutePath.ChangeNetwork);

  const accountDetails = useMatch(RoutePath.AccountDetails);
  const enterSeedPhrase = useMatch(RoutePath.EnterSeedPhrase);
  const createPassword = useMatch(RoutePath.CreatePassword);
  const launchAdena = useMatch(RoutePath.LaunchAdena);

  const forgotPassword = useMatch(RoutePath.ForgotPassword);
  const resetWallet = useMatch(RoutePath.ResetWallet);
  const approveHardwareWalletConnect = useMatch(RoutePath.WebConnectLedger);
  const approveHardwareWalletSelectAccount = useMatch(RoutePath.WebConnectLedgerSelectAccount);

  const [walletState] = useRecoilState(WalletState.state);
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
      return <ProgressMenu progressLevel={'first'} />;
    }
    if (approveEstablish || approveTransaction || approveSign || approveSignFailed) {
      return <ApproveMenu />;
    }
    if (createPassword) {
      return <ProgressMenu progressLevel={'second'} />;
    }
    if (launchAdena) {
      return <ProgressMenu progressLevel={'third'} hideArrow />;
    }
    if (forgotPassword) {
      return <ArrowTitleMenu title={'Forgot Password?'} />;
    }
    if (approveHardwareWalletConnect || approveHardwareWalletSelectAccount) {
      return <TabMenu />;
    }
    if (resetWallet) {
      return location?.state?.from === 'forgot-password' ? (
        <ArrowTitleMenu title='Reset Wallet' />
      ) : (
        <TopMenu />
      );
    }

    if (accountDetails) {
      return <CloseTitleMenu title='Account Details' />;
    }

    if (
      wallet ||
      nft ||
      explore ||
      history ||
      settings ||
      connectedApps ||
      changeNetwork ||
      loadingComplete
    ) {
      return <TopMenu />;
    }
  };

  return <Wrapper>{renderHeader()}</Wrapper>;
};
