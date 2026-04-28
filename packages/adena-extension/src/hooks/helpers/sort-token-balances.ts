import BigNumber from 'bignumber.js';

import { TokenBalanceType } from '@types';

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
