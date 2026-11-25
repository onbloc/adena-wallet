import { z } from 'zod';

import { WalletError, WalletErrorCode } from '../agent';
import { createOnblocReader, type OnblocMcpConfig } from '../harness/mcp';

/** A token the wallet can move. The native token has no `packagePath`; a GRC20 token has one. */
export type ResolvedToken = {
  symbol: string;
  decimals: number;
  packagePath?: string;
  /** What the owner holds, in base units. */
  balance: bigint;
};

/** Finds the token a user or model named, among what `owner` holds. Throws a WalletError. */
export type TokenResolver = (query: string, owner: string, signal?: AbortSignal) => Promise<ResolvedToken>;

export const NATIVE_DENOM = 'ugnot';
const NATIVE_SYMBOL = 'GNOT';
const NATIVE_DECIMALS = 6; // 1 GNOT = 1,000,000 ugnot

/** True when `query` names the native token. It always wins its symbol over a GRC20 lookalike. */
export const isNativeSymbol = (query: string) => query.trim().toLowerCase() === NATIVE_SYMBOL.toLowerCase();

export const nativeToken = (balance: bigint): ResolvedToken => ({
  symbol: NATIVE_SYMBOL,
  decimals: NATIVE_DECIMALS,
  balance,
});

// Amounts are base units; the bound keeps BigInt small for untrusted input.
const units = z.string().regex(/^\d{1,78}$/);
const holdingSchema = z.object({
  packagePath: z.string().min(1),
  symbol: z.string().min(1),
  decimals: z.number().int().min(0).max(36),
  amount: units,
  address: z.string().optional(),
});
const identitySchema = z.object({ address: z.string() });
const nativeSchema = identitySchema.extend({ denom: z.literal(NATIVE_DENOM), balance: units });
const tokensSchema = identitySchema.extend({ items: z.array(holdingSchema).nullable() });
// What the Onbloc reader wraps around a tool's structured output.
const resultSchema = z.object({ untrustedData: z.unknown() });

/**
 * Matches a GRC20 token by symbol (any case) or package path among the holdings. The native
 * token is not a holding: ask `isNativeSymbol` first, so a GRC20 token calling itself GNOT is
 * reachable only by its path.
 */
export function pickToken(query: string, holdings: readonly unknown[]): ResolvedToken {
  const wanted = query.trim();
  const tokens = holdings.flatMap((item) => {
    const parsed = holdingSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
  const matches = tokens.filter((token) =>
    wanted.includes('/')
      ? token.packagePath === wanted
      : !isNativeSymbol(wanted) && token.symbol.toLowerCase() === wanted.toLowerCase()
  );
  if (matches.length === 0) {
    throw new WalletError(WalletErrorCode.UnknownToken, `The wallet holds no token ${wanted}`);
  }
  if (matches.length > 1) {
    const paths = matches.map((token) => token.packagePath);
    throw new WalletError(
      WalletErrorCode.AmbiguousToken,
      `Several tokens are called ${wanted}: ${paths.join(', ')}. Ask the user which one, then use its package path.`,
      paths
    );
  }
  const { symbol, decimals, packagePath, amount } = matches[0];
  return { symbol, decimals, packagePath, balance: BigInt(amount) };
}

/**
 * Resolves tokens from the owner's holdings in the Onbloc MCP: the native balance for GNOT
 * (`get_native_balance`), `get_token_balances` for anything else.
 */
export function createOnblocTokenResolver(config: OnblocMcpConfig): TokenResolver {
  const read = createOnblocReader(config);
  return async (query, owner, signal) => {
    const native = isNativeSymbol(query);
    const toolName = native ? 'get_native_balance' : 'get_token_balances';
    // The reader closes its MCP client when this signal aborts.
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    try {
      signal?.throwIfAborted();
      const tools = await read(owner, controller.signal);
      const tool = tools.get(toolName);
      if (!tool) throw new Error(`Onbloc tool ${toolName} is not available.`);
      const decision = await tool.execute({});
      if (decision.kind !== 'result') {
        throw new Error(`${toolName} failed (${decision.kind === 'denied' ? decision.code : decision.kind})`);
      }
      const { untrustedData } = resultSchema.parse(decision.value);
      if (native) {
        const result = nativeSchema.parse(untrustedData);
        if (result.address !== owner) throw new Error('Native balance belongs to another account');
        return nativeToken(BigInt(result.balance));
      }
      const result = tokensSchema.parse(untrustedData);
      const items = result.items ?? [];
      if (result.address !== owner || items.some((item) =>
        item.address !== undefined && item.address !== owner
      )) throw new Error('Token holdings have inconsistent identity');
      return pickToken(query, items);
    } catch (error) {
      if (error instanceof WalletError || signal?.aborted) throw error;
      throw new WalletError(
        WalletErrorCode.WalletFailed,
        `Could not look up the token ${query.trim()}: ${error instanceof Error ? error.message : 'unknown error'}`
      );
    } finally {
      signal?.removeEventListener('abort', abort);
      controller.abort();
    }
  };
}
