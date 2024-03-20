import React, { useCallback, useEffect } from 'react';
import styled from 'styled-components';
import { useRecoilState } from 'recoil';
import BigNumber from 'bignumber.js';
import { isAirgapAccount } from 'adena-module';

import { RoutePath } from '@types';
import { DoubleButton } from '@components/molecules';
import { useTokenBalance } from '@hooks/use-token-balance';
import MainTokenBalance from '@components/pages/main/main-token-balance/main-token-balance';
import TokenList from '@components/pages/wallet-main/token-list/token-list';
import MainManageTokenButton from '@components/pages/main/main-manage-token-button/main-manage-token-button';
import UnknownTokenIcon from '@assets/common-unknown-token.svg';
import { useCurrentAccount } from '@hooks/use-current-account';
import { WalletState } from '@states';
import { usePreventHistoryBack } from '@hooks/use-prevent-history-back';
import useAppNavigate from '@hooks/use-app-navigate';
import { useNetwork } from '@hooks/use-network';
import MainNetworkLabel from '@components/pages/main/main-network-label/main-network-label';

const Wrapper = styled.main`
  padding-top: 37px;
  text-align: center;

  .network-label-wrapper {
    position: absolute;
    width: 100%;
    height: auto;
    top: 0;
    left: 0;
  }

  .token-balance-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .manage-token-button-wrapper {
    display: flex;
    margin: 24px auto 60px auto;
    align-items: center;
    justify-content: center;
  }
`;

export const WalletMain = (): JSX.Element => {
  usePreventHistoryBack();
  const { navigate } = useAppNavigate();
  const [state] = useRecoilState(WalletState.state);
  const { currentNetwork } = useNetwork();
  const { currentAccount } = useCurrentAccount();
  const { mainTokenBalance, displayTokenBalances, updateBalanceAmountByAccount } =
    useTokenBalance();

  const onClickDepositButton = (): void =>
    navigate(RoutePath.WalletSearch, { state: { type: 'deposit' } });

  const onClickSendButton = (): void => {
    if (!currentAccount) {
      return;
    }
    if (isAirgapAccount(currentAccount)) {
      navigate(RoutePath.BroadcastTransaction);
      return;
    }
    navigate(RoutePath.WalletSearch, { state: { type: 'send' } });
  };

  useEffect(() => {
    if (state === 'CREATE') {
      navigate(RoutePath.Home);
    }
  }, [state]);

  useEffect(() => {
    if (currentAccount) {
      updateBalanceAmountByAccount(currentAccount);
    }
  }, [currentAccount]);

  const tokens = displayTokenBalances
    .filter((tokenBalance) => tokenBalance.display)
    .map((tokenBalance) => {
      return {
        tokenId: tokenBalance.tokenId,
        logo: tokenBalance.image || `${UnknownTokenIcon}`,
        name: tokenBalance.name,
        balanceAmount: {
          value: BigNumber(tokenBalance.amount.value).toFormat(),
          denom: tokenBalance.amount.denom,
        },
      };
    });

  const onClickTokenListItem = useCallback(
    (tokenId: string) => {
      const tokenBalance = displayTokenBalances.find(
        (tokenBalance) => tokenBalance.tokenId === tokenId,
      );
      if (!tokenBalance) {
        window.alert('Token not found');
        return;
      }
      navigate(RoutePath.TokenDetails, {
        state: { tokenBalance },
      });
    },
    [navigate, tokens],
  );

  const onClickManageButton = useCallback(() => {
    navigate(RoutePath.ManageToken);
  }, [navigate]);

  return (
    <Wrapper>
      <div className='network-label-wrapper'>
        <MainNetworkLabel networkName={currentNetwork.networkName} />
      </div>
      <div className='token-balance-wrapper'>
        <MainTokenBalance
          amount={{
            value: BigNumber(mainTokenBalance?.value ?? '0').toFormat(),
            denom: mainTokenBalance?.denom ?? 'GNOT',
          }}
        />
      </div>

      <DoubleButton
        margin='14px 0px 30px'
        leftProps={{ onClick: onClickDepositButton, text: 'Deposit' }}
        rightProps={{
          onClick: onClickSendButton,
          text: 'Send',
        }}
      />

      <div className='token-list-wrapper'>
        <TokenList tokens={tokens} onClickTokenItem={onClickTokenListItem} />
      </div>

      <div className='manage-token-button-wrapper'>
        <MainManageTokenButton onClick={onClickManageButton} />
      </div>
    </Wrapper>
  );
};
