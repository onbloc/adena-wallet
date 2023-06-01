import React, { useCallback, useMemo } from 'react';
import Text from '@components/text';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import { MultilineTextWithArrowButton } from '@components/buttons/multiline-text-with-arrow-button';
import { useAddAccount } from '@hooks/use-add-account';
import { useWalletContext } from '@hooks/use-context';
import { Wrapper } from './AddAccountPage.styles';

const AddAccountPage: React.FC = () => {
  const navigate = useNavigate();
  const { wallet } = useWalletContext();
  const { addAccount } = useAddAccount();

  const onClickCreateAccount = useCallback(async () => {
    if (wallet && wallet.hasHDWallet()) {
      await addAccount();
      navigate(RoutePath.Home);
      return;
    }
    navigate(RoutePath.GenerateSeedPhrase);
  }, [navigate, wallet, addAccount]);

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

export default AddAccountPage;
