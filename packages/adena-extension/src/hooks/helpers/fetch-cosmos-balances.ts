import { Account, ChainRegistry, TokenRegistry } from 'adena-module';
import { COSMOS_TOKEN_ICON_MAP } from '@assets/icons/cosmos-icons';
import { CosmosBalanceService } from '@services/wallet';
import { TokenBalanceType } from '@types';

export interface CosmosFetchResult {
  networkId: string;
  balances: TokenBalanceType[];
  error: boolean;
}

/**
 * Fetch token balances for all registered Cosmos chains.
 *
 * Each chain is queried in parallel and returned as its own entry. A chain
 * that throws is reported with `error: true` so the UI can surface a per-row
 * warning instead of silently dropping the chain. A chain that is simply
 * unconfigured (no entry in chainRegistry) is reported with `error: false`
 * since no network call was attempted.
 */
export async function fetchCosmosTokenBalances(
  account: Account,
  cosmosBalanceService: CosmosBalanceService,
  chainRegistry: ChainRegistry,
  tokenRegistry: TokenRegistry,
  currentAtomoneNetworkId: string | null,
): Promise<CosmosFetchResult[]> {
  const cosmosChains = chainRegistry.list().filter((profile) => {
    if (profile.chainType !== 'cosmos') return false;
    if (profile.chainGroup === 'atomone' && currentAtomoneNetworkId) {
      return profile.id === currentAtomoneNetworkId;
    }
    return true;
  });

  return Promise.all(
    cosmosChains.map(async (profile) => {
      try {
        const chain = chainRegistry.getChain(profile.chainGroup);
        if (!chain) {
          return { networkId: profile.id, balances: [], error: false };
        }
        const address = await account.getAddress(chain.bech32Prefix);
        const tokens = tokenRegistry.list(profile.id);
        const balances = await cosmosBalanceService.getTokenBalances(address, tokens);
        // CosmosQueryClient.getBalance swallows RPC errors into null, which
        // would otherwise look identical to a successful zero balance. When
        // every requested token comes back missing we treat the chain as
        // unreachable so the row-level error and the unresponsive-network
        // indicator surface it — mirroring the gno fetchHealth path.
        const unreachable = tokens.length > 0 && balances.length === 0;
        // Resolve icon URLs through the webpack-processed map so consumers can
        // use `image` directly. The iconUrl on TokenProfile is a domain-level
        // hint and may not match the extension's bundler layout; the map is
        // the source of truth for presentation.
        return {
          networkId: profile.id,
          balances: balances.map((balance) => ({
            ...balance,
            image: COSMOS_TOKEN_ICON_MAP[balance.tokenId] ?? balance.image,
          })),
          error: unreachable,
        };
      } catch {
        return { networkId: profile.id, balances: [], error: true };
      }
    }),
  );
}
