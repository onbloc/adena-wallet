import React, { useEffect, useLayoutEffect } from 'react';
import styled from 'styled-components';
import Text from '@components/text';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import DubbleButton from '@components/buttons/double-button';
import ListBox, { ListHierarchy } from '@components/list-box';
import { maxFractionDigits } from '@common/utils/client-utils';
import { TokenMetainfo } from '@states/token';
import { useTokenBalance } from '@hooks/use-token-balance';
import { useTokenMetainfo } from '@hooks/use-token-metainfo';
import TokenBalance from '@components/common/token-balance/token-balance';
import { BalanceState } from '@states/index';

const Wrapper = styled.main`
  padding-top: 14px;
  text-align: center;

  .token-balance-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

export const WalletMain = () => {
  const navigate = useNavigate();
  const { mainTokenBalance, tokenBalances } = useTokenBalance();
  const { tokenMetainfos } = useTokenMetainfo();

  const DepositButtonClick = () => navigate(RoutePath.WalletSearch, { state: 'deposit' });
  const SendButtonClick = () => navigate(RoutePath.WalletSearch, { state: 'send' });

  return (
    <Wrapper>
      <div className='token-balance-wrapper'>
        <TokenBalance
          value={maxFractionDigits(`${mainTokenBalance?.value ?? 0}`, 6)}
          denom={mainTokenBalance?.denom ?? 'GNOT'}
          orientation='VERTICAL'
          fontStyleKey='header2'
          minimumFontSize='24px'
        />
      </div>

      <DubbleButton
        margin='14px 0px 30px'
        leftProps={{ onClick: DepositButtonClick, text: 'Deposit' }}
        rightProps={{
          onClick: SendButtonClick,
          text: 'Send',
        }}
      />
      <WalletMainTokens balances={tokenBalances} />
    </Wrapper>
  );
};

interface WalletMainTokensProps {
  balances: BalanceState.TokenBalance[];
}

const WalletMainTokens = ({ balances }: WalletMainTokensProps) => {
  const navigate = useNavigate();
  const onClickToken = () => navigate(RoutePath.TokenDetails);

  const getItemBalance = (balance: BalanceState.TokenBalance) => {
    const { amount, denom } = balance;
    return `${maxFractionDigits(amount.value.toString(), 6)} ${denom.toUpperCase()}`;
  };

  return (
    <>
      {balances.map((item, index) => (
        <ListBox
          left={<img src={item.image} alt='logo image' className='logo' />}
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
