import { QueryObserverResult, useQuery } from '@tanstack/react-query';
import { Account } from 'adena-module';
import { useCallback, useEffect, useMemo } from 'react';
import { useRecoilValueLoadable, useSetRecoilState } from 'recoil';

import { COSMOS_TOKEN_ICON_MAP } from '@assets/icons/cosmos-icons';
import { isGRC20TokenModel, isNativeTokenModel } from '@common/validation/validation-token';
import { AccountState, NetworkState } from '@states';
import { Amount, TokenBalanceType, TokenModel } from '@types';

import { CosmosFetchResult, fetchCosmosTokenBalances } from './helpers/fetch-cosmos-balances';
import { compareTokenBalances } from './helpers/sort-token-balances';
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

const EMPTY_AMOUNT: Amount = { value: '', denom: '' };

const tokenKey = (tokenId: string, networkId: string): string => `${tokenId}:${networkId}`;

export const useTokenBalance = (): {
  mainTokenBalance: Amount | null;
  currentBalances: TokenBalanceType[];
  loadingTokenKeys: Set<string>;
  errorNetworkIds: Set<string>;
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
    data: cosmosResults = [],
    refetch: refetchCosmosBalances,
  } = useQuery<CosmosFetchResult[]>(
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

  // Refetch both chains in parallel. Returns the Gno result to satisfy the
  // existing QueryObserverResult return type; callers discard the return value.
  const refetchBalances = useCallback(
    () => Promise.all([refetchGnoBalances(), refetchCosmosBalances()]).then(([gno]) => gno),
    [refetchGnoBalances, refetchCosmosBalances],
  );

  const errorNetworkIds = useMemo(
    () => new Set(cosmosResults.filter((r) => r.error).map((r) => r.networkId)),
    [cosmosResults],
  );

  // Stable string key for the effect below. The Set above is rebuilt on every
  // render where cosmosResults's reference changes (React Query refetches
  // produce new arrays even when the values are unchanged), so using the Set
  // directly as a useEffect dep would re-fire the publish on every render and
  // create an infinite render loop with the atom's subscribers.
  const errorNetworkIdsKey = useMemo(
    () => Array.from(errorNetworkIds).sort().join('|'),
    [errorNetworkIds],
  );

  // Publish the failing cosmos network ids so the header indicator can list
  // them alongside gno failedNetwork without re-running the cosmos query.
  const setCosmosUnresponsiveNetworkIds = useSetRecoilState(
    NetworkState.cosmosUnresponsiveNetworkIds,
  );
  useEffect(() => {
    const ids = errorNetworkIdsKey === '' ? [] : errorNetworkIdsKey.split('|');
    setCosmosUnresponsiveNetworkIds((prev) => {
      if (prev.length === ids.length && prev.every((id, i) => id === ids[i])) {
        return prev;
      }
      return ids;
    });
  }, [errorNetworkIdsKey, setCosmosUnresponsiveNetworkIds]);

  const cosmosResultsByNetwork = useMemo(() => {
    const map = new Map<string, CosmosFetchResult>();
    for (const result of cosmosResults) {
      map.set(result.networkId, result);
    }
    return map;
  }, [cosmosResults]);

  // Expected cosmos token rows for the currently active networks. Sourced
  // from persisted metainfos (not chainRegistry) so the persisted `display`
  // flag is respected from the first frame — otherwise tokens the user has
  // hidden via Manage Tokens flicker into view until metainfos hydrate from
  // storage. The chain filter mirrors fetchCosmosTokenBalances so only rows
  // that will be queried appear in the shell.
  const activeCosmosNetworkIds = useMemo<Set<string>>(() => {
    const profiles = chainRegistry.list().filter((profile) => {
      if (profile.chainType !== 'cosmos') return false;
      if (profile.chainGroup === 'atomone' && currentAtomoneNetwork?.id) {
        return profile.id === currentAtomoneNetwork.id;
      }
      return true;
    });
    return new Set(profiles.map((profile) => profile.id));
  }, [chainRegistry, currentAtomoneNetwork]);

  const cosmosShellTokens = useMemo<TokenModel[]>(() => {
    return allTokenMetainfos
      .filter(
        (meta) => meta.type === 'cosmos-native' && activeCosmosNetworkIds.has(meta.networkId),
      )
      .map((meta) => ({
        ...meta,
        // Persisted metainfo.image is the registry's iconUrl (often empty or a
        // domain hint that does not match webpack-bundled assets). Normalise
        // here so every consumer (wallet-main, manage-token, token-details)
        // receives a usable logo without their own fallback chain.
        image: COSMOS_TOKEN_ICON_MAP[meta.tokenId] ?? meta.image,
      }));
  }, [allTokenMetainfos, activeCosmosNetworkIds]);

  // Build the row shell from token metadata. Each row exists from the first
  // frame; balances populate row-by-row as queries resolve. Rows whose chain
  // errored out keep an empty amount and are surfaced via errorNetworkIds.
  const currentBalances = useMemo<TokenBalanceType[]>(() => {
    const gnoRows: TokenBalanceType[] = tokenMetainfos.map((meta) => {
      const found = gnoBalances.find((b) => b.tokenId === meta.tokenId);
      return {
        ...meta,
        amount: found?.amount ?? EMPTY_AMOUNT,
      };
    });

    const cosmosRows: TokenBalanceType[] = cosmosShellTokens.map((meta) => {
      const networkResult = cosmosResultsByNetwork.get(meta.networkId);
      const found = networkResult?.balances.find(
        (b) => b.tokenId === meta.tokenId && b.networkId === meta.networkId,
      );
      return {
        ...meta,
        amount: found?.amount ?? EMPTY_AMOUNT,
      };
    });

    return [...gnoRows, ...cosmosRows].sort(compareTokenBalances);
  }, [tokenMetainfos, gnoBalances, cosmosResultsByNetwork, cosmosShellTokens]);

  const loadingTokenKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const row of currentBalances) {
      if (row.amount.value !== '') continue;
      if (errorNetworkIds.has(row.networkId)) continue;
      keys.add(tokenKey(row.tokenId, row.networkId));
    }
    return keys;
  }, [currentBalances, errorNetworkIds]);

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

  const mainTokenBalance = useMemo((): Amount | null => {
    if (nativeToken === null) {
      return null;
    }

    const mainToken = currentBalances.find((balance) => balance.tokenId === nativeToken.tokenId);
    if (!mainToken?.amount || mainToken.amount.value === '') {
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
    loadingTokenKeys,
    errorNetworkIds,
    accountNativeBalanceMap,
    refetchBalances,
    refetchAccountNativeBalanceMap,
    toggleDisplayOption,
    fetchBalanceBy,
  };
};
