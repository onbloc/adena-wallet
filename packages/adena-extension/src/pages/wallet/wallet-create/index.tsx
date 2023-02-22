import React, { useEffect } from 'react';
import styled from 'styled-components';
import logo from '../../../assets/logo-default.svg';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import Text from '@components/text';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import GoogleSigninButton from '@components/buttons/google-signin-button';
import theme from '@styles/theme';
import DubbleButton from '@components/buttons/double-button';
import { useLoadAccounts } from '@hooks/use-load-accounts';

export const WalletCreate = () => {
  const navigate = useNavigate();

  const { state, loadAccounts } = useLoadAccounts();

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    switch (state) {
      case 'NONE':
        break;
      case 'FINISH':
        navigate(RoutePath.Wallet);
        break;
      case 'LOGIN':
        navigate(RoutePath.Login);
        break;
      default:
        break;
    }
  }, [state]);

  const onCreateButtonClick = () => {
    navigate(RoutePath.YourSeedPhrase)
  };

  const onRestoreButtonClick = () => {
    navigate(RoutePath.EnterSeedPhrase)
  };

  const importWalletHandler = () => {
    // TODO
    navigate(RoutePath.EnterSeedPhrase);
  };

  const ConnectLedgerHandler = () => {
    // TODO
  };

  return (
    <Wrapper>
      <Logo src={logo} alt='logo' />
      <GoogleSigninButton onClick={() => { }} margin='auto auto 3px' />
      <PoweredByWeb3AuthWihDivider />
      <Button fullWidth hierarchy={ButtonHierarchy.Primary} onClick={onCreateButtonClick}>
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
      {/* <Button fullWidth hierarchy={ButtonHierarchy.Dark} onClick={onRestoreButtonClick}>
          <Text type='body1Bold'>Restore Wallet</Text>
        </Button> */}
    </Wrapper>
  )
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
