import React, { useCallback, useEffect, useLayoutEffect } from 'react';
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
import MainTokenBalance from '@components/main/main-token-balance/main-token-balance';
import TokenList, { MainToken } from '@components/common/token-list/token-list';
import MainManageTokenButton from '@components/main/main-manage-token-button/main-manage-token-button';
import BigNumber from 'bignumber.js';
import UnknownTokenIcon from '@assets/common-unknown-token.svg';

const Wrapper = styled.main`
  padding-top: 14px;
  text-align: center;

  .token-balance-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .manage-token-button-wrapper {
    display: flex;
    margin: 24px auto;
    align-items: center;
    justify-content: center;
  }
`;

export const WalletMain = () => {
  const navigate = useNavigate();
  const { mainTokenBalance, tokenBalances } = useTokenBalance();

  const DepositButtonClick = () => navigate(RoutePath.WalletSearch, { state: 'deposit' });
  const SendButtonClick = () => navigate(RoutePath.WalletSearch, { state: 'send' });

  const tokens = tokenBalances.map(tokenBalance => {
    return {
      tokenId: tokenBalance.tokenId,
      logo: tokenBalance.image || `${UnknownTokenIcon}`,
      name: tokenBalance.name,
      balanceAmount: {
        value: BigNumber(tokenBalance.amount.value).toFormat(),
        denom: tokenBalance.amount.denom
      }
    }
  });

  const onClickTokenListItem = useCallback((tokenId: string) => {
    navigate(RoutePath.TokenDetails);
  }, [tokens]);

  const onClickManageButton = useCallback(() => {
    navigate(RoutePath.ManageToken);
  }, []);

  return (
    <Wrapper>
      <div className='token-balance-wrapper'>
        <MainTokenBalance
          amount={{
            value: BigNumber(mainTokenBalance?.value ?? '0').toFormat(),
            denom: mainTokenBalance?.denom ?? 'GNOT'
          }}
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

      <div className='token-list-wrapper'>
        <TokenList
          tokens={tokens}
          onClickTokenItem={onClickTokenListItem}
        />
      </div>

      <div className='manage-token-button-wrapper'>
        <MainManageTokenButton onClick={onClickManageButton} />
      </div>
    </Wrapper>
  );
};
