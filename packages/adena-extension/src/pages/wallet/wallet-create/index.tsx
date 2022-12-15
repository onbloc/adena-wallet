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

export const WalletCreate = () => {
  const navigate = useNavigate();
  const handleCreateButtonClick = () => navigate(RoutePath.YourSeedPhrase);
  const handleRestoreButtonClick = () => navigate(RoutePath.EnterSeedPhrase);

  const [wallet, state, loadWallet] = useWallet();
  const [gnoClient, , updateNetworks] = useGnoClient();
  const { accounts, initAccounts } = useWalletAccounts(wallet);
  const [currentAccount, , changeCurrentAccount] = useCurrentAccount();
  const [balances, updateBalances] = useWalletBalances();

  useEffect(() => {
    if (!gnoClient) {
      updateNetworks();
    }
  }, [gnoClient])

  useEffect(() => {
    if (accounts && accounts.length > 0) {
      changeCurrentAccount();
    }
  }, [accounts?.length])

  useEffect(() => {
    if (gnoClient?.chainId && currentAccount?.getAddress()) {
      updateBalances();
    }
  }, [gnoClient?.chainId, currentAccount?.getAddress()]);


  useEffect(() => {
    if (balances.length > 0) {
      navigate(RoutePath.Wallet);
    }
  }, [balances])

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

  const isLoading = () => {
    if (
      state !== null &&
      state !== 'LOADING' &&
      state !== 'NONE' &&
      state !== 'FINISH'
    ) {
      return false;
    }
    return true;
  }

  return (
    <>
      {
        isLoading() ? (
          <LoadingWallet />
        ) : (
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
        )}
    </>
  );
};
