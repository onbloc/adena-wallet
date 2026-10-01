import { onlineManager, QueryObserverResult, useQuery } from '@tanstack/react-query';
import { Account, isSessionAccount } from 'adena-module';
import BigNumber from 'bignumber.js';
import { useCallback, useEffect, useMemo } from 'react';
import { useSetRecoilState } from 'recoil';

import { COSMOS_TOKEN_ICON_MAP } from '@assets/icons/cosmos-icons';
import {
  isCosmosNativeTokenModel,
  isGRC20TokenModel,
  isNativeTokenModel,
} from '@common/validation/validation-token';
import { NetworkState } from '@states';
import { Amount, GRC20TokenModel, TokenBalanceType, TokenModel } from '@types';

import { CosmosFetchResult, fetchCosmosTokenBalances } from './helpers/fetch-cosmos-balances';
import {
  compareTokenBalances,
  sortTokenBalancesByStoredOrder,
} from './helpers/sort-token-balances';
import { tokenRowKey } from './helpers/token-order-cache';
import { useAdenaContext } from './use-context';
import { useCurrentAccount } from './use-current-account';
import { useGRC20Tokens } from './use-grc20-tokens';
import { useNetwork } from './use-network';
import { useTokenMetainfo } from './use-token-metainfo';
import { useTokenOrder } from './use-token-order';
import { useWallet } from './use-wallet';

const GNO_REFETCH_INTERVAL = 5_000;
// Cosmos LCD p95 latency is significantly higher than Gno RPC.
// A relaxed interval reduces request pressure and retry noise without
// meaningfully hurting UX — balance changes on AtomOne are less frequent.
const COSMOS_REFETCH_INTERVAL = 10_000;

const EMPTY_AMOUNT: Amount = { value: '', denom: '' };

export const useTokenBalance = (): {
  mainTokenBalance: Amount | null;
  currentBalances: TokenBalanceType[];
  loadingTokenKeys: Set<string>;
  errorNetworkIds: Set<string>;
  /** The native token's balance could not be established. */
  mainTokenUnavailable: boolean;
  refetchBalances: () => Promise<QueryObserverResult<TokenBalanceType[], unknown>>;
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
  const { balanceService, cosmosBalanceService, chainRegistry, tokenRegistry } = useAdenaContext();
  const { currentNetwork, currentAtomoneNetwork } = useNetwork();
  const { currentAccount, currentBalanceAddress } = useCurrentAccount();
  const { existWallet, lockedWallet } = useWallet();
  const { storedOrder, isOrderResolved, persistOrder } = useTokenOrder();

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
    isError: isGnoBalanceError,
    fetchStatus: gnoFetchStatus,
    isPreviousData: isGnoBalancePrevious,
  } = useQuery<TokenBalanceType[]>(
    // 'gno' discriminator keeps this cache entry separate from the Cosmos query
    // even though both share the 'balances' prefix.
    // For an ACTIVE SessionAccount, currentBalanceAddress resolves to the master
    // Gno address: session keys never hold balances, every session-signed tx
    // spends master funds. Once revoked it resolves to the session's own
    // address, whose balance is all the account still controls.
    [
      'balances',
      'gno',
      currentBalanceAddress,
      currentNetwork.chainId,
      isFetchedGRC20Tokens,
      tokenLogoMap,
    ],
    () => {
      if (currentBalanceAddress === null || nativeToken == null) return [];
      return fetchBalances(currentBalanceAddress, tokenMetainfos);
    },
    {
      refetchInterval: GNO_REFETCH_INTERVAL,
      keepPreviousData: true,
      enabled: availableBalanceFetching && currentBalanceAddress !== null && nativeToken !== null,
    },
  );

  const {
    data: cosmosResults = [],
    refetch: refetchCosmosBalances,
    fetchStatus: cosmosFetchStatus,
    isPreviousData: isCosmosBalancePrevious,
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
      // SessionAccount is a Gno-only key; deriving and querying Cosmos
      // addresses for it is meaningless and wastes LCD bandwidth. Skip the
      // query entirely so the Cosmos token rows stay empty in this mode.
      enabled:
        availableBalanceFetching && currentAccount !== null && !isSessionAccount(currentAccount),
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

  // Networks whose balances could not be established, so the UI can show "-".
  // Cosmos reports this through CosmosFetchResult.error; Gno had no equivalent.
  // A paused query counts too — react-query's default networkMode pauses rather
  // than fails while offline, so there is no error to observe. Only while we
  // still believe we are offline: the two chains resume on different intervals.
  const errorNetworkIds = useMemo(() => {
    const ids = new Set(cosmosResults.filter((r) => r.error).map((r) => r.networkId));
    const believedOffline = !onlineManager.isOnline();

    if (isGnoBalanceError || (believedOffline && gnoFetchStatus === 'paused')) {
      // The ids the rows carry, not currentNetwork.networkId: the native token
      // is admitted by its `main` flag and keeps the networkId it was
      // registered under, so keying on the current network misses it.
      for (const meta of tokenMetainfos) {
        if (isCosmosNativeTokenModel(meta)) {
          continue;
        }
        ids.add(meta.networkId);
      }
    }

    // Retained results (keepPreviousData) carry exactly the networks on screen;
    // cosmosShellTokens is declared later and cannot be read here.
    if (believedOffline && cosmosFetchStatus === 'paused') {
      for (const r of cosmosResults) {
        ids.add(r.networkId);
      }
    }

    return ids;
  }, [cosmosResults, cosmosFetchStatus, isGnoBalanceError, gnoFetchStatus, tokenMetainfos]);

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
    // SessionAccount is a Gno-only key. Skip the entire Cosmos row shell so
    // wallet-main/search/deposit lists never surface Cosmos tokens in this
    // mode. The Cosmos query above is already disabled for SessionAccount.
    if (currentAccount && isSessionAccount(currentAccount)) {
      return [];
    }
    return allTokenMetainfos
      .filter(
        (meta) => isCosmosNativeTokenModel(meta) && activeCosmosNetworkIds.has(meta.networkId),
      )
      .map((meta) => ({
        ...meta,
        // Persisted metainfo.image is the registry's iconUrl (often empty or a
        // domain hint that does not match webpack-bundled assets). Normalise
        // here so every consumer (wallet-main, manage-token, token-details)
        // receives a usable logo without their own fallback chain.
        image: COSMOS_TOKEN_ICON_MAP[meta.tokenId] ?? meta.image,
      }));
  }, [allTokenMetainfos, activeCosmosNetworkIds, currentAccount]);

  // Build the row shell from token metadata. Each row exists from the first
  // frame; balances populate row-by-row as queries resolve. Rows whose chain
  // errored out keep an empty amount and are surfaced via errorNetworkIds.
  //
  // Ordering depends on whether the balances are in. Once every row has an
  // amount (or its chain is known to have failed) the comparator ranks them by
  // what they hold. Until then it would be ranking them by which query
  // happened to resolve first — every empty amount sorts to the bottom and
  // jumps up on arrival — so the list replays the order it last settled in and
  // only re-sorts when there is something real to sort by.
  const { currentBalances, balancesSettled } = useMemo<{
    currentBalances: TokenBalanceType[];
    balancesSettled: boolean;
  }>(() => {
    // Nothing may be ordered until the stored order is known. Rendering rows
    // in balance order first and rearranging them once the read returns is the
    // same reshuffle, just sourced from storage latency instead of the network.
    if (!isOrderResolved) {
      return { currentBalances: [], balancesSettled: false };
    }

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

    const rows = [...gnoRows, ...cosmosRows];
    // Amounts alone do not mean these balances are this account's. Both queries
    // keep the previous account's data on a switch (keepPreviousData), which
    // would otherwise read as settled and persist the old account's ranking
    // under the new account's key.
    const showingPreviousBalances = isGnoBalancePrevious || isCosmosBalancePrevious;
    const settled =
      !showingPreviousBalances &&
      rows.length > 0 &&
      rows.every((row) => row.amount.value !== '' || errorNetworkIds.has(row.networkId));

    if (settled || !storedOrder?.length) {
      return { currentBalances: rows.sort(compareTokenBalances), balancesSettled: settled };
    }

    return {
      currentBalances: sortTokenBalancesByStoredOrder(rows, storedOrder),
      balancesSettled: settled,
    };
  }, [
    tokenMetainfos,
    gnoBalances,
    cosmosResultsByNetwork,
    cosmosShellTokens,
    errorNetworkIds,
    storedOrder,
    isOrderResolved,
    isGnoBalancePrevious,
    isCosmosBalancePrevious,
  ]);

  // Remember where the rows settled, and keep remembering: a refetch that
  // changes a balance re-sorts the list, and that new order is what the next
  // load should start from. persistOrder is a no-op when nothing moved.
  useEffect(() => {
    if (!balancesSettled) {
      return;
    }
    persistOrder(currentBalances);
  }, [balancesSettled, currentBalances, persistOrder]);

  const loadingTokenKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const row of currentBalances) {
      if (row.amount.value !== '') continue;
      if (errorNetworkIds.has(row.networkId)) continue;
      keys.add(tokenRowKey(row.tokenId, row.networkId));
    }
    return keys;
  }, [currentBalances, errorNetworkIds]);

  const mainTokenUnavailable = useMemo((): boolean => {
    if (nativeToken === null) {
      return false;
    }
    return errorNetworkIds.has(nativeToken.networkId);
  }, [errorNetworkIds, nativeToken]);

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
      if (token.tokenId === tokenMetainfo.tokenId && token.networkId === tokenMetainfo.networkId) {
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
    if (isCosmosNativeTokenModel(token)) {
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
        ? await balanceService.getGRC20TokenBalance(address, token.tokenId, token.decimals)
        : null;

    return {
      ...token,
      amount: getTokenAmount({
        value: `${balanceAmount || 0}`,
        denom: token.symbol,
      }),
    };
  }

  /**
   * Load balances for a set of tokens, batching GRC20 balances into a single
   * grc20reg qeval (see WalletBalanceService.getGRC20TokenBalanceMap) instead of
   * one round-trip per token. Native / cosmos tokens still resolve individually
   * via fetchBalanceBy.
   */
  async function fetchBalances(address: string, tokens: TokenModel[]): Promise<TokenBalanceType[]> {
    const grc20TokenPaths = tokens
      .filter((token): token is GRC20TokenModel => isGRC20TokenModel(token))
      .map((token) => token.tokenId);

    const grc20BalanceMap = grc20TokenPaths.length
      ? await balanceService
          .getGRC20TokenBalanceMap(address, grc20TokenPaths)
          .catch(() => ({}) as Record<string, bigint>)
      : ({} as Record<string, bigint>);

    return Promise.all(
      tokens.map((token) => {
        if (isGRC20TokenModel(token) && token.tokenId in grc20BalanceMap) {
          const value = new BigNumber(grc20BalanceMap[token.tokenId].toString())
            .shiftedBy(token.decimals * -1)
            .toNumber();
          return {
            ...token,
            amount: getTokenAmount({ value: `${value || 0}`, denom: token.symbol }),
          } as TokenBalanceType;
        }
        return fetchBalanceBy(address, token);
      }),
    );
  }

  return {
    mainTokenBalance,
    mainTokenUnavailable,
    currentBalances,
    loadingTokenKeys,
    errorNetworkIds,
    refetchBalances,
    toggleDisplayOption,
    fetchBalanceBy,
  };
};
