import { getTokenPriceKey } from '@common/utils/price-utils';
import { TokenBalanceType, TokenPriceMap } from '@types';

export interface PortfolioBalanceState {
  /**
   * A priced holding's balance could not be refreshed, so the figure derived
   * from it is a retained one. The total is withheld rather than presented as
   * current — dropping the holding would understate it just as badly.
   */
  unavailable: boolean;
  /**
   * A priced holding has not reported a balance yet. Gno and Cosmos balances
   * resolve independently, so summing what has arrived would present a partial
   * figure as the total and then climb as the rest settle.
   */
  incomplete: boolean;
}

/**
 * How much the portfolio headline can honestly claim, given the state of the
 * balances feeding it.
 *
 * Only priced holdings are considered: an unquoted row contributes nothing to
 * the total whatever its balance does, so neither its absence nor its failure
 * changes the sum.
 */
export function getPortfolioBalanceState(
  displayedBalances: TokenBalanceType[],
  tokenPrices: TokenPriceMap,
  errorNetworkIds: Set<string>,
  loadingTokenKeys: Set<string>,
): PortfolioBalanceState {
  let unavailable = false;
  let incomplete = false;

  for (const { tokenId, networkId } of displayedBalances) {
    const key = getTokenPriceKey(tokenId, networkId);
    if (!tokenPrices[key]) {
      continue;
    }

    if (errorNetworkIds.has(networkId)) {
      unavailable = true;
      continue;
    }

    // loadingTokenKeys uses the same `tokenId:networkId` shape, and holds only
    // balances that have never arrived — a background refetch keeps the last
    // value, so this cannot flicker on every poll.
    if (loadingTokenKeys.has(key)) {
      incomplete = true;
    }
  }

  return { unavailable, incomplete };
}
