import React, { useEffect } from 'react';
import styled from 'styled-components';
import Text from '@components/text';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import LoadingWallet from '@components/loading-screen/loading-wallet';
import DubbleButton from '@components/buttons/double-button';
import ListBox, { ListHierarchy } from '@components/list-box';
import { useWalletBalances } from '@hooks/use-wallet-balances';
import { maxFractionDigits } from '@common/utils/client-utils';
import { useGnoClient } from '@hooks/use-gno-client';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useRecoilState } from 'recoil';
import { WalletState } from '@states/index';
import { useTransactionHistory } from '@hooks/use-transaction-history';
import { useLoadAccounts } from '@hooks/use-load-accounts';

const Wrapper = styled.main`
  padding-top: 14px;
  text-align: center;
`;

export const WalletMain = () => {
  const navigate = useNavigate();

  const [gnoClient] = useGnoClient();
  const [currentAccount] = useCurrentAccount();
  const [, updateBalances] = useWalletBalances(gnoClient);
  const [balances] = useWalletBalances(gnoClient);
  const [currentBalance] = useRecoilState(WalletState.currentBalance);
  const [tokenConfig] = useRecoilState(WalletState.tokenConfig);
  const [, updateLastHistory] = useTransactionHistory();

  const DepositButtonClick = () => navigate(RoutePath.WalletSearch, { state: 'deposit' });
  const SendButtonClick = () => navigate(RoutePath.WalletSearch, { state: 'send' });

  useEffect(() => {
    if (currentAccount && gnoClient) {
      updateLastHistory();
      updateBalances();
    }
  }, [gnoClient, currentAccount?.getAddress()]);

  const getCurrentBalance = () => {
    if (!currentBalance.denom) {
      return ' \n';
    }
    return `${maxFractionDigits(currentBalance.amount.toString(), 6)}\n${currentBalance.denom}`;
  };

  return (
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
  );
};

interface WalletMainTokensProps {
  tokenConfig: Array<WalletState.TokenConfig>;
  balances: Array<WalletState.Balance>;
}

const WalletMainTokens = ({ tokenConfig, balances }: WalletMainTokensProps) => {
  const navigate = useNavigate();
  const onClickToken = () => navigate(RoutePath.TokenDetails);

  const getItemBalance = (item: WalletState.TokenConfig) => {
    const balance = balances.find((balance) => balance.denom === item.denom);
    if (!balance) {
      return '';
    }
    const { amount, denom } = balance;
    return `${maxFractionDigits(amount.toString(), 6)} ${denom.toUpperCase()}`;
  };

  return (
    <>
      {tokenConfig.map((item, index) => (
        <ListBox
          left={<img src={item.imageData} alt='logo image' className='logo' />}
          center={
            <Text type='body1Bold' margin='0px auto 0px 0px'>
              {item.name || ''}
            </Text>
          }
          right={<Text type='body2Reg'>{getItemBalance(item)}</Text>}
          hoverAction={true}
          key={index}
          onClick={onClickToken}
          mode={ListHierarchy.Normal}
        />
      ))}
    </>
  );
};
