import React, { useEffect } from 'react';
import styled from 'styled-components';
import Text from '@components/text';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import LoadingWallet from '@components/loading-screen/loading-wallet';
import DubbleButton from '@components/buttons/double-button';
import ListBox from '@components/list-box';
import { useWalletBalances } from '@hooks/use-wallet-balances';
import { useWallet } from '@hooks/use-wallet';
import { useWalletAccounts } from '@hooks/use-wallet-accounts';
import { maxFractionDigits } from '@common/utils/client-utils';
import { useGnoClient } from '@hooks/use-gno-client';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useRecoilState } from 'recoil';
import { WalletState } from '@states/index';
import { useTransactionHistory } from '@hooks/use-transaction-history';

const Wrapper = styled.main`
  padding-top: 14px;
  text-align: center;
`;

export const WalletMain = () => {
  const navigate = useNavigate();
  const DepositButtonClick = () => navigate(RoutePath.WalletSearch, { state: 'deposit' });
  const SendButtonClick = () => navigate(RoutePath.WalletSearch, { state: 'send' });
  const [wallet, state] = useWallet();
  const [gnoClient] = useGnoClient();
  const { initAccounts } = useWalletAccounts(wallet);
  const [balances, updateBalances] = useWalletBalances();
  const [currentAccount] = useCurrentAccount();
  const [currentBalance, setCurrentBalance] = useRecoilState(WalletState.currentBalance);
  const [tokenConfig] = useRecoilState(WalletState.tokenConfig);
  const [, updateLastHistory] = useTransactionHistory();

  const currentAccountAddress = currentAccount?.getAddress();
  const finishedWalletLoading = gnoClient && state === 'FINISH';
  const finishedBalanceLoading = balances && balances.length > 0;

  useEffect(() => {
    if (finishedWalletLoading) {
      updateAccounts();
    }
  }, [state, gnoClient]);

  useEffect(() => {
    if (currentAccountAddress) {
      updateCurrentAccount();
    }
  }, [currentAccountAddress])

  useEffect(() => {
    updateCurrentBalance();
  }, [balances]);

  const updateAccounts = () => {
    initAccounts();
  };

  const updateCurrentAccount = () => {
    updateBalances();
    updateLastHistory();
  };

  const updateCurrentBalance = () => {
    if (!finishedBalanceLoading) {
      return;
    }
    if (balances[0].amountDenom.toUpperCase() !== balances[0].denom.toUpperCase()) {
      return;
    }
    setCurrentBalance({
      amount: balances[0].amount,
      denom: balances[0].amountDenom.toUpperCase()
    });
  }

  const getCurrentBalance = () => {
    if (!currentBalance.denom) {
      return null;
    }
    return `${maxFractionDigits(currentBalance.amount.toString(), 6)}\n${currentBalance.denom}`
  };

  return (finishedWalletLoading && finishedBalanceLoading) ?
    (
      <Wrapper>
        <Text type='header2' textAlign='center'>
          {getCurrentBalance()}
        </Text>
        <DubbleButton
          margin='14px 0px 30px'
          leftProps={{ onClick: DepositButtonClick, text: 'Deposit' }}
          rightProps={{
            onClick: SendButtonClick,
            text: 'Send',
          }}
        />
        <WalletMainTokens tokenConfig={tokenConfig} balances={balances} />
      </Wrapper>
    ) : (
      <LoadingWallet />
    )
};

interface WalletMainTokensProps {
  tokenConfig: Array<WalletState.TokenConfig>;
  balances: Array<WalletState.Balance>;
};

const WalletMainTokens = ({ tokenConfig, balances }: WalletMainTokensProps) => {
  const navigate = useNavigate();
  const onClickToken = () => navigate(RoutePath.TokenDetails);

  const getItemBalance = (item: WalletState.TokenConfig) => {
    const balance = balances.find(balance => balance.denom === item.denom);
    if (!balance) {
      return '';
    }
    const { amount, denom } = balance
    return `${maxFractionDigits(amount.toString(), 6)} ${denom.toUpperCase()}`;
  };

  return <>
    {
      tokenConfig.map((item, index) => (
        <ListBox
          left={
            <img src={item.imageData} alt='logo image' />
          }
          center={
            <Text type='body1Bold'>{item.name || ''}</Text>
          }
          right={
            <Text type='body2Reg'>{getItemBalance(item)}</Text>
          }
          hoverAction={true}
          gap={12}
          key={index}
          onClick={onClickToken}
        />
      ))
    }
  </>
};