import BigNumber from 'bignumber.js';

import { TokenBalanceType } from '@types';

import { tokenRowKey } from './token-order-cache';

// Comparator for the wallet-main token list.
//
// Phase A (current): native token (`main: true`, i.e. GNOT) is pinned at the
// top, the rest is ordered by raw amount descending, with symbol ascending as
// a tiebreaker. Tokens with missing or non-numeric amounts sort to the end so
// that loading/error rows do not jump above rows with real values.
//
// Phase B (later, after USD price integration): swap the amount step for fiat
// value desc; the GNOT pin and symbol tiebreaker stay.
export function compareTokenBalances(a: TokenBalanceType, b: TokenBalanceType): number {
  if (a.main && !b.main) return -1;
  if (!a.main && b.main) return 1;

  const aAmount = parseAmount(a);
  const bAmount = parseAmount(b);

  if (aAmount === null && bAmount === null) {
    return compareSymbol(a, b);
  }
  if (aAmount === null) return 1;
  if (bAmount === null) return -1;

  const cmp = bAmount.comparedTo(aAmount);
  if (cmp !== 0) return cmp;

  return compareSymbol(a, b);
}

function parseAmount(token: TokenBalanceType): BigNumber | null {
  const raw = token.amount?.value;
  if (raw === undefined || raw === null || raw === '') return null;
  const parsed = new BigNumber(raw);
  if (parsed.isNaN()) return null;
  return parsed;
}

function compareSymbol(a: TokenBalanceType, b: TokenBalanceType): number {
  return (a.symbol ?? '').localeCompare(b.symbol ?? '');
}

/**
 * Order the rows the way they were last seen, appending anything the stored
 * order does not know about.
 *
 * Used while balances are still arriving. Sorting by amount at that point
 * ranks rows by how far along their queries are rather than by what they hold,
 * so the list reshuffles on every resolved query; replaying the last settled
 * order keeps it still until the amounts are all in and a real sort can run.
 *
 * Rows missing from the stored order — a token discovered since it was written
 * — sort among themselves by {@link compareTokenBalances} and land at the end,
 * where a new row with no balance yet would sort anyway. The native token is
 * pinned to the top regardless, matching the comparator's first rule: a stored
 * order predating the pin must not push it back down.
 */
export function sortTokenBalancesByStoredOrder(
  balances: TokenBalanceType[],
  order: string[],
): TokenBalanceType[] {
  const rank = new Map<string, number>();
  order.forEach((key, index) => {
    if (!rank.has(key)) {
      rank.set(key, index);
    }
  });

  const ranked: { token: TokenBalanceType; rank: number }[] = [];
  const unranked: TokenBalanceType[] = [];

  for (const token of balances) {
    const tokenRank = rank.get(tokenRowKey(token.tokenId, token.networkId));
    if (tokenRank === undefined) {
      unranked.push(token);
      continue;
    }
    ranked.push({ token, rank: tokenRank });
  }

  ranked.sort((a, b) => a.rank - b.rank);

  const sorted = [...ranked.map(({ token }) => token), ...unranked.sort(compareTokenBalances)];

  const mainIndex = sorted.findIndex((token) => token.main);
  if (mainIndex > 0) {
    const [mainToken] = sorted.splice(mainIndex, 1);
    sorted.unshift(mainToken);
  }

  return sorted;
}
