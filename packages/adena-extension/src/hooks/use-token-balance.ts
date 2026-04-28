import { QueryObserverResult, useQuery } from '@tanstack/react-query';
import { Account } from 'adena-module';
import { useCallback, useEffect, useMemo } from 'react';
import { useRecoilValueLoadable } from 'recoil';

import { isGRC20TokenModel, isNativeTokenModel } from '@common/validation/validation-token';
import { AccountState } from '@states';
import { Amount, TokenBalanceType, TokenModel } from '@types';

import { fetchCosmosTokenBalances } from './helpers/fetch-cosmos-balances';
import { useAdenaContext, useWalletContext } from './use-context';
import { useCurrentAccount } from './use-current-account';
import { useGRC20Tokens } from './use-grc20-tokens';
import { useNetwork } from './use-network';
import { useTokenMetainfo } from './use-token-metainfo';
import { useWallet } from './use-wallet';

const GNO_REFETCH_INTERVAL = 3_000;
// Cosmos LCD p95 latency is significantly higher than Gno RPC.
// A relaxed interval reduces request pressure and retry noise without
// meaningfully hurting UX — balance changes on AtomOne are less frequent.
const COSMOS_REFETCH_INTERVAL = 10_000;

export const useTokenBalance = (): {
  mainTokenBalance: Amount | null;
  currentBalances: TokenBalanceType[];
  accountNativeBalanceMap: Record<string, TokenBalanceType>;
  refetchBalances: () => Promise<QueryObserverResult<TokenBalanceType[], unknown>>;
  refetchAccountNativeBalanceMap: () => Promise<
    QueryObserverResult<Record<string, TokenBalanceType>, unknown>
  >;
  fetchBalanceBy: (address: string, token: TokenModel) => Promise<TokenBalanceType>;
  toggleDisplayOption: (account: Account, token: TokenModel, activated: boolean) => void;
} => {
  const { isFetched: isFetchedGRC20Tokens } = useGRC20Tokens();
  const {
    currentTokenMetainfos: tokenMetainfos,
    tokenMetainfos: allTokenMetainfos,
    tokenLogoMap,
    updateTokenMetainfos,
    getTokenAmount,
  } = useTokenMetainfo();
  const { wallet } = useWalletContext();
  const { balanceService, cosmosBalanceService, chainRegistry, tokenRegistry } = useAdenaContext();
  const { currentNetwork, currentAtomoneNetwork } = useNetwork();
  const { currentAddress, currentAccount } = useCurrentAccount();
  const { existWallet, lockedWallet } = useWallet();

  useEffect(() => {
    balanceService.setTokenMetainfos(tokenMetainfos);
  }, [tokenMetainfos, balanceService]);

  // Declared early because it is referenced in the Gno query's `enabled` condition below.
  const nativeToken = useMemo((): TokenModel | null => {
    return tokenMetainfos.find((tokenModel) => tokenModel.main) || null;
  }, [tokenMetainfos]);

  const availableBalanceFetching = useMemo(() => {
    if (!existWallet || lockedWallet) {
      return false;
    }

    if (!isFetchedGRC20Tokens || tokenMetainfos.length === 0) {
      return false;
    }

    return true;
  }, [existWallet, lockedWallet, tokenMetainfos, isFetchedGRC20Tokens]);

  // Gno and Cosmos are fetched in two independent queries so that each chain
  // has its own lifecycle: separate cache, refetch interval, error state, and
  // loading state. A slow or failing Cosmos LCD never blocks the Gno result
  // from rendering, and either chain can be invalidated without touching the other.
  const {
    data: gnoBalances = [],
    refetch: refetchGnoBalances,
  } = useQuery<TokenBalanceType[]>(
    // 'gno' discriminator keeps this cache entry separate from the Cosmos query
    // even though both share the 'balances' prefix.
    ['balances', 'gno', currentAddress, currentNetwork.chainId, isFetchedGRC20Tokens, tokenLogoMap],
    () => {
      if (currentAddress === null || nativeToken == null) return [];
      return Promise.all(
        tokenMetainfos.map((tokenModel) => fetchBalanceBy(currentAddress, tokenModel)),
      );
    },
    {
      refetchInterval: GNO_REFETCH_INTERVAL,
      keepPreviousData: true,
      enabled: availableBalanceFetching && currentAddress !== null && nativeToken !== null,
    },
  );

  // Pre-derive { accountId -> address } once per (wallet, prefix) so the
  // 3s refetch loop below reuses the memoized map instead of re-deriving on
  // every tick.
  const accountAddressesLoadable = useRecoilValueLoadable(
    AccountState.accountAddressesByPrefix(currentNetwork.addressPrefix),
  );
  const accountAddressesByAccountId =
    accountAddressesLoadable.state === 'hasValue' ? accountAddressesLoadable.contents : null;

  const {
    data: cosmosBalances = [],
    refetch: refetchCosmosBalances,
  } = useQuery<TokenBalanceType[]>(
    // Keyed by account id (not the object reference) to avoid spurious refetches
    // when a new Account instance is created from the same underlying data.
    [
      'balances',
      'cosmos',
      currentAccount?.id ?? null,
      currentNetwork.chainId,
      currentAtomoneNetwork?.id ?? null,
    ],
    () => {
      if (currentAccount === null) return [];
      // No .catch() here — let React Query own the error state. When this query
      // fails, cosmosBalances defaults to [] via the fallback, so Gno balances
      // continue rendering unaffected.
      return fetchCosmosTokenBalances(
        currentAccount,
        cosmosBalanceService,
        chainRegistry,
        tokenRegistry,
        currentAtomoneNetwork?.id ?? null,
      );
    },
    {
      refetchInterval: COSMOS_REFETCH_INTERVAL,
      keepPreviousData: true,
      enabled: availableBalanceFetching && currentAccount !== null,
      // Default retry (3) causes excessive delay and traffic during LCD outages.
      retry: 1,
    },
  );

  const balances = useMemo<TokenBalanceType[]>(
    () => [...gnoBalances, ...cosmosBalances],
    [gnoBalances, cosmosBalances],
  );

  // Refetch both chains in parallel. Returns the Gno result to satisfy the
  // existing QueryObserverResult return type; callers discard the return value.
  const refetchBalances = useCallback(
    () => Promise.all([refetchGnoBalances(), refetchCosmosBalances()]).then(([gno]) => gno),
    [refetchGnoBalances, refetchCosmosBalances],
  );

  const { data: accountNativeBalanceMap = {}, refetch: refetchAccountNativeBalanceMap } = useQuery<
    Record<string, TokenBalanceType>
  >(
    [
      'accountNativeBalanceMap',
      wallet?.accounts,
      currentNetwork.chainId,
      currentNetwork.addressPrefix,
      isFetchedGRC20Tokens,
    ],
    () => {
      if (
        wallet === null ||
        wallet.accounts === null ||
        nativeToken == null ||
        accountAddressesByAccountId === null
      ) {
        return {};
      }

      return Promise.all(
        wallet.accounts.map(async (account) => {
          const address = accountAddressesByAccountId[account.id];
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
      refetchInterval: GNO_REFETCH_INTERVAL,
      enabled: availableBalanceFetching && accountAddressesByAccountId !== null,
    },
  );

  const currentBalances = useMemo((): TokenBalanceType[] => {
    if (balances.length === 0) {
      return [];
    }
    const gnoTokenBalances = tokenMetainfos.map((tokenMetainfo) => ({
      ...tokenMetainfo,
      amount: balances.find((t) => t.tokenId === tokenMetainfo.tokenId)?.amount || {
        value: '',
        denom: '',
      },
    }));
    // Apply the persisted `display` flag from metainfos to cosmos balances.
    // Defaults to `true` while the seed effect in useTokenMetainfo is still
    // in-flight, so newly-discovered cosmos tokens stay visible.
    const cosmosTokenBalances = balances
      .filter((b) => b.type === 'cosmos-native')
      .map((b) => {
        const meta = allTokenMetainfos.find(
          (m) => m.tokenId === b.tokenId && m.networkId === b.networkId,
        );
        return {
          ...b,
          display: meta?.display ?? true,
        };
      });
    return [...gnoTokenBalances, ...cosmosTokenBalances];
  }, [balances, tokenMetainfos, allTokenMetainfos]);

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
    // Iterate the full account metainfos (not the network-filtered alias) so
    // that toggling a token does not wipe entries from other networks. Match
    // by both tokenId and networkId to disambiguate same-symbol tokens that
    // exist on multiple chains (e.g. ATONE on mainnet vs testnet).
    const changedTokenInfos: TokenModel[] = allTokenMetainfos.map((tokenMetainfo) => {
      if (
        token.tokenId === tokenMetainfo.tokenId &&
        token.networkId === tokenMetainfo.networkId
      ) {
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
    // Cosmos branch: the `address` arg is the current (Gno-prefixed) address,
    // which does not apply to Cosmos chains. Resolve the chain-specific address
    // from currentAccount + chain.bech32Prefix and query the Cosmos LCD.
    // Without this branch Send would read 0 for ATONE/PHOTON even when the
    // wallet-main screen shows a non-zero balance (uses fetchCosmosTokenBalances).
    if (token.type === 'cosmos-native') {
      const zeroBalance: TokenBalanceType = {
        ...token,
        amount: getTokenAmount({ value: '0', denom: token.symbol }),
      };

      if (!currentAccount) return zeroBalance;

      const chain = chainRegistry.getChainByChainId(token.networkId);
      if (!chain || chain.chainType !== 'cosmos') return zeroBalance;

      const cosmosAddress = await currentAccount.getAddress(chain.bech32Prefix);
      const profile = tokenRegistry.get(token.tokenId);
      if (!profile) return zeroBalance;

      const balance = await cosmosBalanceService.getTokenBalance(cosmosAddress, profile);
      return balance ?? zeroBalance;
    }

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
    refetchBalances,
    refetchAccountNativeBalanceMap,
    toggleDisplayOption,
    fetchBalanceBy,
  };
};
