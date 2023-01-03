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

export const WalletCreate = () => {
  const navigate = useNavigate();
  const handleCreateButtonClick = () => navigate(RoutePath.YourSeedPhrase);
  const handleRestoreButtonClick = () => navigate(RoutePath.EnterSeedPhrase);

  const [wallet, state, loadWallet] = useWallet();
  const [gnoClient, , updateNetworks] = useGnoClient();
  const { accounts, initAccounts } = useWalletAccounts(wallet);
  const [currentAccount, , changeCurrentAccount] = useCurrentAccount();
  const [balances, updateBalances] = useWalletBalances();

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

  return finishedWalletLoading ? (
    <Wrapper>
      <Logo src={logo} alt='logo' />
      <Button
        fullWidth
        hierarchy={ButtonHierarchy.Primary}
        margin='auto 0px 12px'
        onClick={handleCreateButtonClick}
      >
        <Text type='body1Bold'>Create New Wallet</Text>
      </Button>
      <Button fullWidth hierarchy={ButtonHierarchy.Dark} onClick={handleRestoreButtonClick}>
        <Text type='body1Bold'>Restore Wallet</Text>
      </Button>
    </Wrapper>
  ) : (
    <LoadingWallet />
  )
};

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'space-between')};
  width: 100%;
  height: 100%;
  & > header {
    height: 48px;
  }
  & > button:first-of-type {
    margin-top: auto;
    margin-bottom: 12px;
  }
`;

const Logo = styled.img`
  padding-top: 108px;
`;