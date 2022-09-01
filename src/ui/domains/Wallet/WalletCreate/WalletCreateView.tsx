import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import logo from '../../../../assets/logo-default.svg';
import FullButton from '@ui/common/Button/FullButton';
import Typography from '@ui/common/Typography';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import { useSdk } from '@services/client';
import { walletDeserialize, getSavedPassword } from '@services/client/fetcher';
import LoadingWalletView from '@ui/domains/LoadingScreen/LoadingDefaultWallet';
import { promises } from 'stream';

const Wrapper = styled.section`
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

export const WalletCreateView = () => {
  const navigate = useNavigate();
  const sdk = useSdk();
  const handleCreateButtonClick = () => navigate(RoutePath.YourSeedPhrase);
  const handleRestoreButtonClick = () => navigate(RoutePath.EnterSeedPharse);
  const [isExistWallet, setExistWallet] = useState(false);

  const autoLogin = () => {
    getSavedPassword()
      .then((pwd: string) => {
        walletDeserialize(pwd)
          .then((wallet) => {
            sdk.init(wallet);
            navigate(RoutePath.Wallet);
          })
          .catch(() => navigate(RoutePath.Login));
      })
      .catch(() => {
        chrome.storage.local.get(['adenaWallet'], async (result) => {
          if (result.adenaWallet) {
            navigate(RoutePath.Login);
          } else {
          }
        });
        setExistWallet(true);
      });
  };

  useEffect(() => {
    autoLogin();
  });

  useEffect(() => {
    // console.log(loginHandler());
    console.log('WalletCreateView sdk.initialized : ', sdk.initialized);
  }, [sdk]);

  return (
    <>
      {!isExistWallet && !sdk.initialized ? (
        <LoadingWalletView />
      ) : (
        <Wrapper>
          <Logo src={logo} alt='logo' />
          <FullButton mode='primary' margin='auto 0px 12px' onClick={handleCreateButtonClick}>
            <Typography type='body1Bold'>Create New Wallet</Typography>
          </FullButton>
          <FullButton mode='dark' onClick={handleRestoreButtonClick}>
            <Typography type='body1Bold'>Restore Wallet</Typography>
          </FullButton>
        </Wrapper>
      )}
    </>
  );
};
