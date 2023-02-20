import React, { useEffect } from 'react';
import styled from 'styled-components';
import logo from '../../../assets/logo-default.svg';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import Text from '@components/text';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import LoadingWallet from '@components/loading-screen/loading-wallet';
import { useWallet } from '@hooks/use-wallet';
import { useWalletAccounts } from '@hooks/use-wallet-accounts';
import { useWalletBalances } from '@hooks/use-wallet-balances';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useGnoClient } from '@hooks/use-gno-client';
import { CommonState } from '@states/index';
import { useRecoilState } from 'recoil';
import GoogleSigninButton from '@components/buttons/google-signin-button';
import theme from '@styles/theme';
import DubbleButton from '@components/buttons/double-button';

export const WalletCreate = () => {
  const navigate = useNavigate();
  const handleCreateButtonClick = () => navigate(RoutePath.YourSeedPhrase);
  const handleRestoreButtonClick = () => navigate(RoutePath.EnterSeedPhrase);

  const [wallet, state, loadWallet] = useWallet();
  const [gnoClient, , updateNetworks] = useGnoClient();
  const { accounts, initAccounts } = useWalletAccounts(wallet);
  const [currentAccount, , changeCurrentAccount] = useCurrentAccount();
  const [balances, updateBalances] = useWalletBalances();
  const [failedNetwork] = useRecoilState(CommonState.failedNetwork);

  const finishedGnoClientLoading = Boolean(gnoClient?.chainId);
  const finishedAccountsLoading = Boolean(accounts?.length);
  const finishedCurrentAccountLoading = Boolean(currentAccount?.getAddress());
  const finishedBalancesLoading = balances.length > 0;
  const finishedWalletLoading = state === 'CREATE';

  useEffect(() => {
    if (!finishedGnoClientLoading) {
      updateNetworks();
    }
  }, [gnoClient]);

  useEffect(() => {
    if (finishedAccountsLoading) {
      changeCurrentAccount();
    }
  }, [finishedAccountsLoading]);

  useEffect(() => {
    if (finishedCurrentAccountLoading && finishedGnoClientLoading) {
      updateBalances();
    }
  }, [finishedGnoClientLoading, finishedCurrentAccountLoading]);

  useEffect(() => {
    if (finishedBalancesLoading) {
      navigate(RoutePath.Wallet);
    }
  }, [finishedBalancesLoading]);

  useEffect(() => {
    if (failedNetwork) {
      navigate(RoutePath.Wallet);
    }
  }, [failedNetwork]);

  useEffect(() => {
    switch (state) {
      case 'NONE':
        loadWallet();
        break;
      case 'FINISH':
        initAccounts();
        break;
      case 'LOGIN':
        navigate(RoutePath.Login);
        break;
      default:
        break;
    }
  }, [state]);

  const importWalletHandler = () => {
    // TODO
    navigate(RoutePath.EnterSeedPhrase);
  };

  const ConnectLedgerHandler = () => {
    // TODO
  };

  return finishedWalletLoading ? (
    <Wrapper>
      <Logo src={logo} alt='logo' />
      <GoogleSigninButton onClick={() => {}} margin='auto auto 3px' />
      <PoweredByWeb3AuthWihDivider />
      <Button fullWidth hierarchy={ButtonHierarchy.Primary} onClick={handleCreateButtonClick}>
        <Text type='body1Bold'>Create New Wallet</Text>
      </Button>
      <DubbleButton
        margin='12px 0px 0px'
        leftProps={{
          onClick: importWalletHandler,
          text: 'Import Wallet',
          hierarchy: ButtonHierarchy.Custom,
          bgColor: theme.color.neutral[6],
        }}
        rightProps={{
          onClick: ConnectLedgerHandler,
          text: 'Connect Ledger',
          hierarchy: ButtonHierarchy.Custom,
          bgColor: theme.color.neutral[6],
        }}
      />
      {/* <Button fullWidth hierarchy={ButtonHierarchy.Dark} onClick={handleRestoreButtonClick}>
          <Text type='body1Bold'>Restore Wallet</Text>
        </Button> */}
    </Wrapper>
  ) : (
    <LoadingWallet />
  );
};

const ButtonWrap = styled.div`
  width: 100%;
  margin-top: auto;
`;

const PoweredByWeb3AuthWihDivider = () => (
  <>
    <Text type='light11' color={theme.color.neutral[9]}>
      Powered by Web3Auth
    </Text>
    <Divider />
  </>
);

const Divider = styled.span`
  width: calc(100% - 48px);
  height: 1px;
  background-color: ${({ theme }) => theme.color.neutral[4]};
  margin: 20px 0px;
`;

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'space-between')};
  width: 100%;
  height: 100%;
  & > header {
    height: 48px;
  }
  /* & > button:first-of-type {
    margin-top: auto;
    margin-bottom: 12px;
  } */
`;

const Logo = styled.img`
  padding-top: 33px;
`;
