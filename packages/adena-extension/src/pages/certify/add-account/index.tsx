import React, { useEffect, useState } from 'react';
import styled, { css } from 'styled-components';
import Text from '@components/text';
import theme from '@styles/theme';
import arrowRight from '../../../assets/arrowS-right.svg';
import arrowRightDisabled from '../../../assets/arrowS-right-disabled.svg';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import { useWalletAccountPathController } from '@hooks/use-wallet-account-path-controller';
import { useWalletAccounts } from '@hooks/use-wallet-accounts';
import { useWallet } from '@hooks/use-wallet';
import { useCurrentAccount } from '@hooks/use-current-account';
import LoadingWallet from '@components/loading-screen/loading-wallet';
import { MultilineTextWithArrowButton } from '@components/buttons/multiline-text-with-arrow-button';
import { useAddAccount } from '@hooks/use-add-account';

export const AddAccount = () => {
  const navigate = useNavigate();
  const [wallet, walletState] = useWallet();
  const { addAccount } = useAddAccount();
  const [currentAccount, , changeCurrentAccount] = useCurrentAccount();
  const [currentState, setCurrentState] = useState('INIT');

  useEffect(() => {
    switch (currentState) {
      case 'LOADING':
        if (walletState === 'FINISH') {
          navigate(RoutePath.Home);
        }
        break;
      case 'FINISH':
        navigate(RoutePath.Wallet);
        break;
      default:
        break;
    }
  }, [currentState, walletState]);

  useEffect(() => {
    if (currentState === 'LOADING') {
      setCurrentState('FINISH');
    }
  }, [currentAccount]);

  const isLoading = () => {
    return currentState === 'INCREASE' || currentState === 'LOADING';
  };

  const onClickCreateAccount = async () => {
    await setCurrentState('INCREASE');
    await addAccount();
    await setCurrentState('FINISH');
  };

  const existsPopups = async () => {
    const windows = await chrome.windows.getAll();
    return windows.findIndex((window) => window.type === 'popup') > -1;
  };

  const onClickConnectHardwareWallet = async () => {
    const isPopup = await existsPopups();
    if (isPopup) {
      return;
    }

    const popupOption: chrome.windows.CreateData = {
      url: chrome.runtime.getURL(`popup.html#${RoutePath.ApproveHardwareWalletInit}`),
      type: 'popup',
      height: 590,
      width: 380,
      left: 800,
      top: 300,
    };

    window.close();
    chrome.windows.create(popupOption);
  };

  const onClickImportPrivateKey = () => {
    navigate(RoutePath.ImportPrivateKey);
  };

  const addAccountContent = [
    {
      title: 'Create New Account',
      subTitle: 'Generate a new account address',
      onClick: onClickCreateAccount,
    },
    {
      title: 'Import Private Key',
      subTitle: 'Import an existing address',
      onClick: onClickImportPrivateKey,
    },
    {
      title: 'Connect Ledger',
      subTitle: 'Connect Ledger',
      onClick: onClickConnectHardwareWallet,
    },
  ];

  return isLoading() ? (
    <LoadingWallet />
  ) : (
    <Wrapper>
      <Text className='main-title' type='header4'>
        Add Account
      </Text>
      {addAccountContent.map((v, i) => (
        <MultilineTextWithArrowButton
          key={i}
          title={v.title}
          subTitle={v.subTitle}
          onClick={v.onClick}
        />
      ))}
      <Button
        fullWidth
        hierarchy={ButtonHierarchy.Dark}
        onClick={() => navigate(-1)}
        margin='auto 0px 0px'
      >
        <Text type='body1Bold'>Close</Text>
      </Button>
    </Wrapper>
  );
};

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-start', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  .main-title {
    margin-bottom: 12px;
  }
`;
