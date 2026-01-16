import { isAirgapAccount, isMultisigAccount } from 'adena-module';
import BigNumber from 'bignumber.js';
import { useCallback, useEffect, useMemo } from 'react';
import { useRecoilState } from 'recoil';
import styled from 'styled-components';

import UnknownTokenIcon from '@assets/common-unknown-token.svg';
import { Button, Row, Text } from '@components/atoms';
import IconThunder from '@components/atoms/icon/icon-assets/icon-thunder';
import LoadingButton from '@components/atoms/loading-button/loading-button';
import MainManageTokenButton from '@components/pages/main/main-manage-token-button/main-manage-token-button';
import MainNetworkLabel from '@components/pages/main/main-network-label/main-network-label';
import MainTokenBalance from '@components/pages/main/main-token-balance/main-token-balance';
import TokenList from '@components/pages/wallet-main/token-list/token-list';
import useAppNavigate from '@hooks/use-app-navigate';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useFaucet } from '@hooks/use-faucet';
import { useLoadImages } from '@hooks/use-load-images';
import { useNetwork } from '@hooks/use-network';
import { usePreventHistoryBack } from '@hooks/use-prevent-history-back';
import { useToast } from '@hooks/use-toast';
import { useTokenBalance } from '@hooks/use-token-balance';
import { useTokenMetainfo } from '@hooks/use-token-metainfo';
import { WalletState } from '@states';
import mixins from '@styles/mixins';
import { RoutePath } from '@types';
import { useGetAccountInfo } from '@hooks/wallet/use-get-account-info';

const REFETCH_INTERVAL = 3_000;

const Wrapper = styled.main`
  padding-top: 37px;
  text-align: center;
  overflow: auto;

  .network-label-wrapper {
    position: fixed;
    width: 100%;
    height: auto;
    top: 48px;
    left: 0;
    background-color: ${({ theme }): string => theme.neutral._8};
  }

  .token-balance-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .main-button-wrapper {
    ${mixins.flex({ direction: 'row', justify: 'space-between' })};
    width: 100%;
    gap: 8px;
    margin: 14px 0px 30px;
  }

  .manage-token-button-wrapper {
    display: flex;
    margin: 24px auto 60px auto;
    align-items: center;
    justify-content: center;
  }
`;

const MainButton = styled(Button)`
  border-radius: 18px;
`;

const StyledFaucetButtonContent = styled(Row)`
  gap: 8px;
`;

export const WalletMain = (): JSX.Element => {
  usePreventHistoryBack();
  const { navigate } = useAppNavigate();
  const [state] = useRecoilState(WalletState.state);
  const { currentNetwork } = useNetwork();
  const { currentAccount, currentAddress } = useCurrentAccount();
  const { data: currentAccountInfo } = useGetAccountInfo(currentAddress);
  const { mainTokenBalance, currentBalances } = useTokenBalance();
  const { refetchBalances } = useTokenBalance();
  const { updateAllTokenMetainfos, getTokenImage } = useTokenMetainfo();
  const { isSupported: supportedFaucet, isLoading: isFaucetLoading, faucet } = useFaucet();
  const { show } = useToast();

  const { addLoadingImages, completeImageLoading } = useLoadImages();

  const canSignTransaction = useMemo(() => {
    return Boolean(currentAccountInfo?.publicKey?.value);
  }, [currentAccountInfo]);

  const showSignTxButton = useMemo(() => {
    if (!currentAccount) return false;

    return !isAirgapAccount(currentAccount) && !isMultisigAccount(currentAccount);
  }, [currentAccount]);

  const onClickFaucetButton = (): void => {
    if (isFaucetLoading) {
      return;
    }
    faucet().then((result) => {
      show(result.message);
    });
  };

  const onClickDepositButton = (): void =>
    navigate(RoutePath.WalletSearch, { state: { type: 'deposit' } });

  const onClickActionButton = (): void => {
    if (!currentAccount) {
      return;
    }
    if (isAirgapAccount(currentAccount)) {
      navigate(RoutePath.BroadcastTransaction);
      return;
    }
    if (isMultisigAccount(currentAccount)) {
      navigate(RoutePath.BroadcastMultisigTransactionScreen);
      return;
    }
    navigate(RoutePath.WalletSearch, { state: { type: 'send' } });
  };

  const onClickSignButton = (): void => {
    if (!currentAccount) {
      return;
    }

    navigate(RoutePath.SignMultisigTransactionScreen);
    return;
  };

  const actionButtonText: string | null = useMemo(() => {
    if (!currentAccount) {
      return null;
    }

    if (isMultisigAccount(currentAccount)) {
      return 'Broadcast';
    }

    return 'Send';
  }, [isMultisigAccount, currentAccount]);

  useEffect(() => {
    if (state === 'CREATE') {
      navigate(RoutePath.Home);
    }
  }, [state]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null;

    if (currentAccount?.id && currentNetwork.chainId) {
      interval = setInterval(() => {
        updateAllTokenMetainfos().then(() => {
          refetchBalances();
        });
      }, REFETCH_INTERVAL);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [currentAccount?.id, currentNetwork.chainId]);

  const tokens = useMemo(() => {
    return currentBalances
      .filter((tokenBalance) => tokenBalance.display)
      .filter((tokenBalance) => !BigNumber(tokenBalance.amount.value).isNaN())
      .map((tokenBalance) => {
        return {
          tokenId: tokenBalance.tokenId,
          logo: getTokenImage(tokenBalance) || `${UnknownTokenIcon}`,
          name: tokenBalance.name,
          balanceAmount: {
            value: BigNumber(tokenBalance.amount.value).toFormat(),
            denom: tokenBalance.amount.denom,
          },
        };
      });
  }, [currentBalances, getTokenImage]);

  const tokenImages = useMemo(() => {
    return tokens.map((token) => token.logo);
  }, [tokens]);

  const onClickTokenListItem = useCallback(
    (tokenId: string) => {
      const tokenBalance = currentBalances.find((tokenBalance) => tokenBalance.tokenId === tokenId);
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

  useEffect(() => {
    addLoadingImages(tokenImages);
  }, [tokenImages.length]);

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

      <div className='main-button-wrapper'>
        {supportedFaucet ? (
          <MainButton
            hierarchy='dark'
            as={LoadingButton}
            loading={isFaucetLoading}
            fullWidth
            onClick={onClickFaucetButton}
          >
            <StyledFaucetButtonContent>
              <IconThunder />
              <Text type={'body1Bold'}>Faucet</Text>
            </StyledFaucetButtonContent>
          </MainButton>
        ) : (
          <MainButton hierarchy='dark' fullWidth onClick={onClickDepositButton}>
            <Text type={'body1Bold'}>Deposit</Text>
          </MainButton>
        )}
        <MainButton hierarchy='dark' fullWidth onClick={onClickActionButton}>
          <Text type={'body1Bold'}>{actionButtonText}</Text>
        </MainButton>
        {showSignTxButton && (
          <MainButton hierarchy='dark' fullWidth onClick={onClickSignButton}>
            <Text type={'body1Bold'}>Sign</Text>
          </MainButton>
        )}
      </div>

      <div className='token-list-wrapper'>
        <TokenList
          tokens={tokens}
          completeImageLoading={completeImageLoading}
          onClickTokenItem={onClickTokenListItem}
        />
      </div>

      <div className='manage-token-button-wrapper'>
        <MainManageTokenButton onClick={onClickManageButton} />
      </div>
    </Wrapper>
  );
};
