import { z } from 'zod';

import { createOnblocReader, type OnblocMcpConfig } from '../../harness/mcp';
import { fromBaseUnits, normalizeDecimal, WalletError, WalletErrorCode } from '../../agent';
import { MockWalletSdk } from './mockWalletSdk';
import type { MockHolding } from './fixture';
import { TokenSymbol, type Balances } from './tokens';

// The mock wallet holds the account's real api-v3 balances as a read-only snapshot: it
// prepares transactions but never signs, so balances do not change.

const GNOT_DECIMALS = 6; // 1 GNOT = 1,000,000 ugnot
const GNS_PACKAGE_PATH = 'gno.land/r/gnoswap/gns';

const units = z.string().regex(/^\d+$/);
const nativeSchema = z.object({ denom: z.literal('ugnot'), balance: units });
const tokensSchema = z.object({ items: z.array(z.unknown()).nullable() });
// What the Onbloc reader wraps around a tool's structured output.
const resultSchema = z.object({ untrustedData: z.unknown() });
const tokenSchema = z.object({
  packagePath: z.string().min(1),
  amount: units,
  decimals: z.number().int().min(0).max(36),
});
const holdingSchema = tokenSchema.extend({ symbol: z.string().trim().min(1) });

function decimalString(amount: string, decimals: number): string {
  const value = fromBaseUnits(BigInt(amount), decimals);
  // The mock wallet only holds amounts that fit its decimal parser.
  if (normalizeDecimal(value) === null) throw new Error('Onbloc balance is too large for the mock wallet.');
  return value;
}

/** Maps the outputs of `get_native_balance` and `get_token_balances` to mock balances. */
export function balancesFromOnbloc(native: unknown, tokens: unknown): Balances {
  const nativeBalance = nativeSchema.safeParse(native);
  const tokenBalances = tokensSchema.safeParse(tokens);
  if (!nativeBalance.success || !tokenBalances.success) {
    throw new Error('Unexpected Onbloc balance response.');
  }
  // Match the GNS package path, not the symbol: any token can call itself GNS.
  const gns = (tokenBalances.data.items ?? [])
    .map((item) => tokenSchema.safeParse(item))
    .find((item) => item.success && item.data.packagePath === GNS_PACKAGE_PATH);
  return {
    [TokenSymbol.Gnot]: decimalString(nativeBalance.data.balance, GNOT_DECIMALS),
    [TokenSymbol.Gns]: gns?.success ? decimalString(gns.data.amount, gns.data.decimals) : '0',
  };
}

/** Retains token identities and precision for the wallet, independently of its legacy display. */
export function holdingsFromOnbloc(tokens: unknown): MockHolding[] {
  const result = tokensSchema.safeParse(tokens);
  if (!result.success) throw new Error('Unexpected Onbloc balance response.');
  return (result.data.items ?? []).flatMap((item) => {
    const parsed = holdingSchema.safeParse(item);
    if (!parsed.success) {
      if (item && typeof item === 'object' && ('symbol' in item || ('packagePath' in item && typeof item.packagePath === 'string'))) {
        throw new WalletError(WalletErrorCode.WalletFailed, 'Invalid token holdings snapshot');
      }
      return [];
    }
    const { packagePath, symbol, amount, decimals } = parsed.data;
    return [{ packagePath, symbol, amount: decimalString(amount, decimals), decimals }];
  });
}

export type OnblocAccountConfig = OnblocMcpConfig & Readonly<{ account: string }>;

/** Reads one owner-scoped snapshot through the Onbloc MCP. */
async function fetchOnblocSnapshot(
  { account, ...config }: OnblocAccountConfig,
  signal?: AbortSignal,
  includeHoldings = true
): Promise<{ balances: Balances; holdings: MockHolding[] }> {
  // The reader closes its MCP client when this signal aborts.
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  try {
    if (signal?.aborted) abort();
    const tools = await createOnblocReader(config)(account, controller.signal);
    const read = async (name: string) => {
      const tool = tools.get(name);
      if (!tool) throw new Error(`Onbloc tool ${name} is not available.`);
      const decision = await tool.execute({});
      if (decision.kind !== 'result') {
        throw new Error(`Onbloc ${name} failed (${decision.kind === 'denied' ? decision.code : decision.kind}).`);
      }
      return resultSchema.parse(decision.value).untrustedData;
    };
    const [native, tokens] = await Promise.all([read('get_native_balance'), read('get_token_balances')]);
    return { balances: balancesFromOnbloc(native, tokens), holdings: includeHoldings ? holdingsFromOnbloc(tokens) : [] };
  } finally {
    signal?.removeEventListener('abort', abort);
    controller.abort();
  }
}

/** Reads the account's GNOT and GNS balances through the Onbloc MCP. */
export async function fetchOnblocBalances(config: OnblocAccountConfig, signal?: AbortSignal): Promise<Balances> {
  return (await fetchOnblocSnapshot(config, signal, false)).balances;
}

/** A mock wallet that owns `account`, funded with its current Onbloc balances. */
export async function createOnblocMockWallet({
  onbloc,
  signal,
}: {
  onbloc: OnblocAccountConfig;
  signal?: AbortSignal;
}): Promise<MockWalletSdk> {
  const { balances, holdings } = await fetchOnblocSnapshot(onbloc, signal);
  return new MockWalletSdk({
    chainId: onbloc.chainId,
    accounts: [{ name: 'My address', address: onbloc.account, balances, holdings }],
  });
}
