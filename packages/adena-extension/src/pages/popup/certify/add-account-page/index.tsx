import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import { RoutePath } from '@types';
import { Text } from '@components/atoms';
import { BottomFixedButton } from '@components/molecules';
import { useAddAccount } from '@hooks/use-add-account';
import { useWalletContext } from '@hooks/use-context';
import mixins from '@styles/mixins';

import { MultilineTextWithArrowButton } from './multiline-text-with-arrow-button';
import useAppNavigate from '@hooks/use-app-navigate';

const Wrapper = styled.main`
  ${mixins.flex({ align: 'flex-start', justify: 'flex-start' })};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  .main-title {
    margin-bottom: 12px;
  }
`;

const AddAccountPage: React.FC = () => {
  const { navigate, goBack } = useAppNavigate();
  const { wallet } = useWalletContext();
  const { addAccount } = useAddAccount();

  const onClickCreateAccount = useCallback(async () => {
    if (wallet && wallet.hasHDWallet()) {
      await addAccount();
      navigate(RoutePath.Home);
      return;
    }
    navigate(RoutePath.GenerateSeedPhrase);
  }, [wallet, addAccount]);

  const onClickConnectHardwareWallet = useCallback(async () => {
    const windows = await chrome.windows.getAll();
    const isPopup = windows.findIndex((window) => window.type === 'popup') > -1;
    if (isPopup) {
      return;
    }

    const popupOption: chrome.tabs.CreateProperties = {
      url: chrome.runtime.getURL(`popup.html#${RoutePath.ApproveHardwareWalletConnect}`),
      active: true,
    };

    window.close();
    chrome.tabs.create(popupOption);
  }, []);

  const onClickImportPrivateKey = useCallback(() => {
    navigate(RoutePath.ImportPrivateKey);
  }, [navigate]);

  const addAccountContent = useMemo(
    () => [
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
    ],
    [onClickCreateAccount, onClickImportPrivateKey, onClickConnectHardwareWallet],
  );

  return (
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
          disabled={v.disabled}
        />
      ))}
      <BottomFixedButton text='Close' onClick={goBack} />
    </Wrapper>
  );
};

export default AddAccountPage;
