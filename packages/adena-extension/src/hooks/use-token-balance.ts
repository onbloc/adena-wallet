import { useQuery } from '@tanstack/react-query';
import { Account } from 'adena-module';
import { useEffect, useMemo } from 'react';

import { isGRC20TokenModel, isNativeTokenModel } from '@common/validation/validation-token';
import { Amount, TokenBalanceType, TokenModel } from '@types';

import { useAdenaContext, useWalletContext } from './use-context';
import { useCurrentAccount } from './use-current-account';
import { useGRC20Tokens } from './use-grc20-tokens';
import { useNetwork } from './use-network';
import { useTokenMetainfo } from './use-token-metainfo';
import { useWallet } from './use-wallet';

export const useTokenBalance = (): {
  mainTokenBalance: Amount | null;
  currentBalances: TokenBalanceType[];
  accountNativeBalanceMap: Record<string, TokenBalanceType>;
  fetchBalanceBy: (address: string, token: TokenModel) => Promise<TokenBalanceType>;
  toggleDisplayOption: (account: Account, token: TokenModel, activated: boolean) => void;
} => {
  const { isFetched: isFetchedGRC20Tokens } = useGRC20Tokens();
  const {
    currentTokenMetainfos: tokenMetainfos,
    tokenLogoMap,
    updateTokenMetainfos,
    getTokenAmount,
  } = useTokenMetainfo();
  const { wallet } = useWalletContext();
  const { balanceService } = useAdenaContext();
  const { currentNetwork } = useNetwork();
  const { currentAddress } = useCurrentAccount();
  const { existWallet, lockedWallet } = useWallet();

  useEffect(() => {
    balanceService.setTokenMetainfos(tokenMetainfos);
  }, [tokenMetainfos, balanceService]);

  const availableBalanceFetching = useMemo(() => {
    if (!existWallet || lockedWallet) {
      return false;
    }

    if (!isFetchedGRC20Tokens || tokenMetainfos.length === 0) {
      return false;
    }

    return true;
  }, [existWallet, lockedWallet, tokenMetainfos, isFetchedGRC20Tokens]);

  const { data: balances = [] } = useQuery<TokenBalanceType[]>(
    [
      'balances',
      currentAddress,
      currentNetwork.chainId,
      tokenMetainfos.map((token) => token.tokenId),
      isFetchedGRC20Tokens,
      tokenLogoMap,
    ],
    () => {
      if (currentAddress === null || nativeToken == null) {
        return [];
      }
      return Promise.all(
        tokenMetainfos.map((tokenModel) => fetchBalanceBy(currentAddress, tokenModel)),
      );
    },
    {
      refetchInterval: 5000,
      enabled: availableBalanceFetching,
    },
  );

  const { data: accountNativeBalanceMap = {} } = useQuery<Record<string, TokenBalanceType>>(
    [
      'accountNativeBalanceMap',
      wallet?.accounts,
      currentNetwork.chainId,
      tokenMetainfos.map((token) => token.tokenId),
      isFetchedGRC20Tokens,
    ],
    () => {
      if (wallet === null || wallet.accounts === null || nativeToken == null) {
        return {};
      }

      return Promise.all(
        wallet.accounts.map(async (account) => {
          const address = await account.getAddress(currentNetwork.addressPrefix);
          return fetchBalanceBy(address, nativeToken);
        }),
      ).then((balances) =>
        balances.reduce<Record<string, TokenBalanceType>>((accum, current, index) => {
          if (wallet.accounts[index]?.id) {
            accum[wallet.accounts[index]?.id] = current;
          }
          return accum;
        }, {}),
      );
    },
    {
      refetchInterval: 5000,
      enabled: availableBalanceFetching,
    },
  );

  const currentBalances = useMemo((): TokenBalanceType[] => {
    if (balances.length === 0) {
      return [];
    }
    return tokenMetainfos.map((tokenMetainfo) => ({
      ...tokenMetainfo,
      amount: balances.find((t) => t.tokenId === tokenMetainfo.tokenId)?.amount || {
        value: '',
        denom: '',
      },
    }));
  }, [balances, tokenMetainfos]);

  const nativeToken = useMemo((): TokenModel | null => {
    return tokenMetainfos.find((tokenModel) => tokenModel.main) || null;
  }, [tokenMetainfos]);

  const mainTokenBalance = useMemo((): Amount | null => {
    if (nativeToken === null) {
      return null;
    }

    const mainToken = currentBalances.find((balance) => balance.tokenId === nativeToken.tokenId);
    if (!mainToken?.amount) {
      return null;
    }

    return mainToken.amount;
  }, [currentBalances, nativeToken]);

  async function toggleDisplayOption(
    account: Account,
    token: TokenModel,
    activated: boolean,
  ): Promise<void> {
    const changedTokenInfos: TokenModel[] = tokenMetainfos.map((tokenMetainfo) => {
      if (token.tokenId === tokenMetainfo.tokenId) {
        return {
          ...tokenMetainfo,
          display: activated,
        };
      }
      return tokenMetainfo;
    });
    await updateTokenMetainfos(account, changedTokenInfos);
  }

  async function fetchBalanceBy(address: string, token: TokenModel): Promise<TokenBalanceType> {
    const balanceAmount = isNativeTokenModel(token)
      ? await balanceService.getGnotTokenBalance(address)
      : isGRC20TokenModel(token)
        ? await balanceService.getGRC20TokenBalance(address, token.pkgPath, token.decimals)
        : null;

    return {
      ...token,
      amount: getTokenAmount({
        value: `${balanceAmount || 0}`,
        denom: token.symbol,
      }),
    };
  }

  return {
    mainTokenBalance,
    currentBalances,
    accountNativeBalanceMap,
    toggleDisplayOption,
    fetchBalanceBy,
  };
};
