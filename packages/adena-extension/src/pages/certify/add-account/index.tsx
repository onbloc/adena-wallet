import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import Text from '@components/text';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import { MultilineTextWithArrowButton } from '@components/buttons/multiline-text-with-arrow-button';
import { useAddAccount } from '@hooks/use-add-account';
import { useLoadAccounts } from '@hooks/use-load-accounts';
import { useAdenaContext } from '@hooks/use-context';

export const AddAccount = () => {
  const navigate = useNavigate();
  const { walletService } = useAdenaContext();
  const { addAccount } = useAddAccount();
  const { loadAccounts } = useLoadAccounts();

  const onClickCreateAccount = async () => {
    const existWallet = await walletService.existsWallet();
    if (existWallet) {
      await addAccount();
      loadAccounts();
      navigate(RoutePath.Home);
      return;
    }

    navigate(RoutePath.GenerateSeedPhrase);
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

    const popupOption: chrome.tabs.CreateProperties = {
      url: chrome.runtime.getURL(`popup.html#${RoutePath.ApproveHardwareWalletConnect}`),
      active: true
    };

    window.close();
    chrome.tabs.create(popupOption);
  };

  const onClickImportPrivateKey = () => {
    navigate(RoutePath.ImportPrivateKey);
  };

  const getAddAccountContent = () => [
    {
      title: 'Create New Account',
      subTitle: 'Generate a new account',
      onClick: onClickCreateAccount,
    },
    {
      title: 'Import Private Key',
      subTitle: 'Import an existing account',
      onClick: onClickImportPrivateKey,
      disabled: false,
    },
    {
      title: 'Connect Ledger',
      subTitle: 'Add a ledger account',
      onClick: onClickConnectHardwareWallet,
      disabled: false,
    },
  ];

  return (
    <Wrapper>
      <Text className='main-title' type='header4'>
        Add Account
      </Text>
      {getAddAccountContent().map((v, i) => (
        <MultilineTextWithArrowButton
          key={i}
          title={v.title}
          subTitle={v.subTitle}
          onClick={v.onClick}
          disabled={v.disabled}
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
