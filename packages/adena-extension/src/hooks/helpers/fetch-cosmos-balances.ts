import { Account, ChainRegistry, TokenRegistry } from 'adena-module';
import { COSMOS_TOKEN_ICON_MAP } from '@assets/icons/cosmos-icons';
import { CosmosBalanceService } from '@services/wallet';
import { TokenBalanceType } from '@types';

/**
 * Fetch token balances for all registered Cosmos chains.
 *
 * Each chain is queried in parallel. If a single chain's LCD call fails,
 * that chain returns [] so Gno balances are never affected.
 */
export async function fetchCosmosTokenBalances(
  account: Account,
  cosmosBalanceService: CosmosBalanceService,
  chainRegistry: ChainRegistry,
  tokenRegistry: TokenRegistry,
  currentAtomoneNetworkId: string | null,
): Promise<TokenBalanceType[]> {
  const cosmosChains = chainRegistry.list().filter((profile) => {
    if (profile.chainType !== 'cosmos') return false;
    if (profile.chainGroup === 'atomone' && currentAtomoneNetworkId) {
      return profile.id === currentAtomoneNetworkId;
    }
    return true;
  });

  const results = await Promise.all(
    cosmosChains.map(async (profile) => {
      try {
        const chain = chainRegistry.getChain(profile.chainGroup);
        if (!chain) return [];
        const address = await account.getAddress(chain.bech32Prefix);
        const tokens = tokenRegistry.list(profile.id);
        return cosmosBalanceService.getTokenBalances(address, tokens);
      } catch {
        return [];
      }
    }),
  );

  // Resolve icon URLs through the webpack-processed map so that consumers
  // (TokenDetails, Search, TransferInput, etc.) can use `image` directly.
  // The iconUrl string on the TokenProfile is a domain-level hint and may
  // not match the extension's bundler layout; the map is the source of truth
  // for presentation. Falls back to the profile-provided string if unmapped.
  return results.flat().map((balance) => ({
    ...balance,
    image: COSMOS_TOKEN_ICON_MAP[balance.tokenId] ?? balance.image,
  }));
}
