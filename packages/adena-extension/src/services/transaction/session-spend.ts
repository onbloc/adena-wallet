// Sign-time spend estimator that mirrors gno's ante phase 2 SpendForSigner
// summation (tm2/pkg/sdk/auth/ante.go:155-168). This is a UX-fast guard:
// if the projected spend already exceeds spendLimit, popup is blocked
// before the user pays gas. Chain still re-checks at broadcast time, so
// passing this gate is not a guarantee of acceptance.

// Coin/Coins string format = gno coin convention:
//   "100ugnot"            single coin
//   "100ugnot,5uatom"     multiple denoms (comma-separated, no spaces required)
//   ""                    empty = no spending

const COIN_REGEX = /^([0-9]+)\s*([a-z/][a-z0-9_.:/]{2,})$/;

const ZERO = BigInt(0);

export interface Coin {
  amount: bigint;
  denom: string;
}

export type Coins = Coin[];

export function parseCoins(coinsStr: string): Coins {
  const trimmed = coinsStr.trim();
  if (trimmed === '') return [];
  const entries = trimmed.split(',').map((e) => e.trim());
  const result: Coins = [];
  for (const entry of entries) {
    const m = entry.match(COIN_REGEX);
    if (!m) {
      throw new Error(`invalid coin: "${entry}"`);
    }
    const amount = BigInt(m[1]);
    if (amount < ZERO) {
      throw new Error(`non-positive coin amount: ${m[1]}`);
    }
    result.push({ amount, denom: m[2] });
  }
  return mergeAndSort(result);
}

function mergeAndSort(coins: Coins): Coins {
  const merged = new Map<string, bigint>();
  for (const c of coins) {
    merged.set(c.denom, (merged.get(c.denom) ?? ZERO) + c.amount);
  }
  return Array.from(merged.entries())
    .map(([denom, amount]) => ({ denom, amount }))
    .filter((c) => c.amount > ZERO)
    .sort((a, b) => (a.denom < b.denom ? -1 : a.denom > b.denom ? 1 : 0));
}

export function addCoins(a: Coins, b: Coins): Coins {
  return mergeAndSort([...a, ...b]);
}

// Chain Coins.IsAllGTE(other): for every denom in `other`, this has >= amount.
// Denoms missing on the left side count as 0.
export function isAllGTE(limit: Coins, used: Coins): boolean {
  const limitMap = new Map(limit.map((c) => [c.denom, c.amount]));
  for (const u of used) {
    const have = limitMap.get(u.denom) ?? ZERO;
    if (have < u.amount) return false;
  }
  return true;
}

export function coinsToString(coins: Coins): string {
  return coins.map((c) => `${c.amount.toString()}${c.denom}`).join(',');
}

// ─────────────────────────────────────────────────────────────────────────
// SpendEstimator: per-message SpendForSigner equivalent
// ─────────────────────────────────────────────────────────────────────────

export interface DecodedMessageForSpend {
  type: string;
  value: {
    // bank
    from_address?: string;
    amount?: string; // bank/MsgSend amount
    // vm
    send?: string;
    max_deposit?: string; // vm storage deposit — counts toward session spend
    caller?: string;
  };
}

export interface SpendTxFee {
  amount: string;
  denom: string;
}

// estimateSessionSpend sums fee + each message's SpendForSigner(signerAddress).
// signerAddress = master address (since GetSigners() returns [caller/from],
// which Phase 3 sets to master for SessionAccount). The chain's session
// outflow check (ante.go phase 2a) uses this same sum.
export function estimateSessionSpend(
  messages: DecodedMessageForSpend[],
  fee: SpendTxFee,
  signerAddress: string,
): Coins {
  let total: Coins = [];
  if (fee && fee.amount && fee.denom) {
    total = addCoins(total, parseCoins(`${fee.amount}${fee.denom}`));
  }
  for (const m of messages) {
    total = addCoins(total, spendForSigner(m, signerAddress));
  }
  return total;
}

function spendForSigner(message: DecodedMessageForSpend, signerAddress: string): Coins {
  switch (message.type) {
    case '/bank.MsgSend': {
      if (message.value.from_address !== signerAddress) return [];
      return safeParse(message.value.amount);
    }
    case '/vm.m_call':
    case '/vm.m_run': {
      // vm caller carries gas fee separately;
      // `send` is the coin outflow and `max_deposit` is the storage deposit.
      // The chain counts BOTH against the session spend limit
      // (ADR-001: lockStorageDeposit calls CheckAndDeductSessionSpend),
      // so a session must not be able to pass this check with send='' and a large max_deposit.
      return addCoins(safeParse(message.value.send), safeParse(message.value.max_deposit));
    }
    default:
      return [];
  }
}

function safeParse(coinsStr: string | undefined): Coins {
  if (!coinsStr || coinsStr === '') return [];
  try {
    return parseCoins(coinsStr);
  } catch {
    return [];
  }
}

// effectiveSpendUsed applies the spend_period reset boundary for UX-side
// pre-checks ONLY. Storage spendUsed / spendReset are not mutated here;
// the next getSession sync will reflect the chain-side reset.
export function effectiveSpendUsed(
  spendUsed: string | undefined,
  spendReset: number | undefined,
  spendPeriod: number,
  nowSeconds: number,
): Coins {
  if (spendPeriod > 0 && spendReset !== undefined && nowSeconds >= spendReset + spendPeriod) {
    return [];
  }
  if (!spendUsed) return [];
  return parseCoins(spendUsed);
}
