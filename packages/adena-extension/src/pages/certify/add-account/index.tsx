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
import { WalletAccount } from 'adena-module';

export const AddAccount = () => {
  const navigate = useNavigate();
  const [wallet, walletState] = useWallet();
  const { accounts, addAccount, initAccounts } = useWalletAccounts(wallet);
  const [increaseAccount] = useWalletAccountPathController();
  const [currentAccount, , changeCurrentAccount] = useCurrentAccount();
  const [currentState, setCurrentState] = useState('INIT');

  useEffect(() => {
    switch (currentState) {
      case 'LOADING':
        if (walletState === 'FINISH') {
          updateCurrentAccount();
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
    return (currentState === 'INCREASE' || currentState === 'LOADING');
  }

  const onClickCreateAccount = async () => {
    await setCurrentState('INCREASE');
    await increaseAccount();
    await setCurrentState('LOADING');
  };

  const onClickConnectHardwareWallet = () => {
    const popupOption: chrome.windows.CreateData = {
      url: chrome.runtime.getURL(
        `popup.html#${RoutePath.ApproveHardwareWalletInit}`,
      ),
      type: 'popup',
      height: 570,
      width: 380,
      left: 800,
      top: 300,
    };

    window.close();
    chrome.windows.create(popupOption);
  };

  const updateCurrentAccount = async () => {
    if (accounts) {
      const address = accounts[accounts.length - 1].getAddress();
      await initAccounts();
      await changeCurrentAccount(address);
    }
  }

  return isLoading() ? (
    <LoadingWallet />
  ) : (
    <Wrapper>
      <Text className='main-title' type='header4'>
        Add Account
      </Text>
      <GrayButtonBox onClick={onClickCreateAccount}>
        <Text className='title-arrow' type='body1Bold'>
          Create New Account
        </Text>
        <Text type='body2Reg' color={theme.color.neutral[2]}>
          Generate a new account address
        </Text>
      </GrayButtonBox>
      <GrayButtonBox onClick={() => false} disabled>
        <Text className='title-arrow' type='body1Bold'>
          Import Account
        </Text>
        <Text className='title-desc' type='body2Reg'>
          Import an existing account
        </Text>
      </GrayButtonBox>
      <GrayButtonBox onClick={onClickConnectHardwareWallet}>
        <Text className='title-arrow' type='body1Bold'>
          Connect Hardware Wallet
        </Text>
        <Text className='title-desc' type='body2Reg'>
          Add a ledger account
        </Text>
      </GrayButtonBox>
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
  padding-top: 30px;
  .main-title {
    margin-bottom: 30px;
  }
`;

const GrayButtonBox = styled.div<{ disabled?: boolean }>`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-start', 'space-between')};
  width: 100%;
  height: 80px;
  border-radius: 18px;
  padding: 12px 18px 14px 20px;
  & + & {
    margin-top: 12px;
  }
  .title-arrow {
    ${({ theme }) => theme.mixins.flexbox('row', 'center', 'space-between')};
    width: 100%;
    ${({ disabled }) => `background: url(${disabled === true ? arrowRightDisabled : arrowRight}) no-repeat center right;`}
  }
  .import-des {
    color: ${({ theme }) => theme.color.neutral[2]};
  }
  transition: all 0.4s ease;
  ${({ disabled, theme }) =>
    disabled
      ? css`
          background-color: ${theme.color.neutral[6]};
          cursor: default;
          color: ${theme.color.neutral[10]};
        `
      : css`
          background-color: ${theme.color.neutral[4]};
          cursor: pointer;
          &:hover {
            background-color: ${theme.color.neutral[5]};
          }
        `}
`;
