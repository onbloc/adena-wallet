import { z } from 'zod';

import { createOnblocReader, type OnblocMcpConfig } from '../harness/onbloc-mcp';
import { fromBaseUnits, normalizeDecimal } from './amount';
import { TokenSymbol } from './constants';
import { MockWalletSdk } from './sdk/mockWalletSdk';
import type { ApprovalHandler, Balances } from './sdk/types';

// The mock wallet starts from the account's real api-v3 balances; after that the two
// are allowed to drift apart (transfers only move mock balances).

const GNOT_DECIMALS = 6; // 1 GNOT = 1,000,000 ugnot
const GNS_PACKAGE_PATH = 'gno.land/r/gnoswap/gns';

const units = z.string().regex(/^\d+$/);
const nativeSchema = z.object({ denom: z.literal('ugnot'), balance: units });
const tokensSchema = z.object({ items: z.array(z.unknown()).nullable() });
// What the Onbloc reader wraps around a tool's structured output.
const resultSchema = z.object({ untrustedData: z.unknown() });
const tokenSchema = z.object({
  packagePath: z.string(),
  amount: units,
  decimals: z.number().int().min(0).max(36),
});

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

export type OnblocAccountConfig = OnblocMcpConfig & Readonly<{ account: string }>;

/** Reads the account's GNOT and GNS balances through the Onbloc MCP. */
export async function fetchOnblocBalances(
  { account, ...config }: OnblocAccountConfig,
  signal?: AbortSignal
): Promise<Balances> {
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
    return balancesFromOnbloc(native, tokens);
  } finally {
    signal?.removeEventListener('abort', abort);
    controller.abort();
  }
}

/** A mock wallet that owns `account`, funded with its current Onbloc balances. */
export async function createOnblocMockWallet({
  onbloc,
  requestApproval,
  signal,
}: {
  onbloc: OnblocAccountConfig;
  requestApproval: ApprovalHandler;
  signal?: AbortSignal;
}): Promise<MockWalletSdk> {
  const balances = await fetchOnblocBalances(onbloc, signal);
  return new MockWalletSdk({
    requestApproval,
    accounts: [{ name: 'My address', address: onbloc.account, balances }],
  });
}
