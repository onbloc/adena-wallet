import { z } from 'zod';

import { WalletError, WalletErrorCode } from '../agent';
import { createOnblocReader, type OnblocMcpConfig } from '../harness/mcp';

/** A token the wallet can move. The native token has no `packagePath`; a GRC20 token has one. */
export type ResolvedToken = { symbol: string; decimals: number; packagePath?: string };

/** Finds the token a user or model named, among what `owner` holds. Throws a WalletError. */
export type TokenResolver = (query: string, owner: string, signal?: AbortSignal) => Promise<ResolvedToken>;

export const NATIVE_DENOM = 'ugnot';
export const NATIVE_TOKEN: ResolvedToken = { symbol: 'GNOT', decimals: 6 }; // 1 GNOT = 1,000,000 ugnot

const holdingSchema = z.object({
  packagePath: z.string().min(1),
  symbol: z.string().min(1),
  decimals: z.number().int().min(0).max(36),
});
// What the Onbloc reader wraps around a tool's structured output.
const resultSchema = z.object({ untrustedData: z.object({ items: z.array(z.unknown()).nullable() }) });

/**
 * Matches a symbol (any case) or a package path against the holdings. The native token always
 * wins its own symbol, so a GRC20 token calling itself GNOT is reachable only by its path.
 */
export function pickToken(query: string, holdings: readonly unknown[]): ResolvedToken {
  const wanted = query.trim();
  if (wanted.toLowerCase() === NATIVE_TOKEN.symbol.toLowerCase()) return NATIVE_TOKEN;
  const tokens = holdings.flatMap((item) => {
    const parsed = holdingSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
  const matches = tokens.filter((token) =>
    wanted.includes('/') ? token.packagePath === wanted : token.symbol.toLowerCase() === wanted.toLowerCase()
  );
  if (matches.length === 0) {
    throw new WalletError(WalletErrorCode.UnknownToken, `The wallet holds no token ${wanted}`);
  }
  if (matches.length > 1) {
    const paths = matches.map((token) => token.packagePath).join(', ');
    throw new WalletError(
      WalletErrorCode.AmbiguousToken,
      `Several tokens are called ${wanted}: ${paths}. Ask the user which one, then use its package path.`
    );
  }
  return matches[0];
}

/** Resolves tokens from the owner's holdings in the Onbloc MCP (`get_token_balances`). */
export function createOnblocTokenResolver(config: OnblocMcpConfig): TokenResolver {
  const read = createOnblocReader(config);
  return async (query, owner, signal) => {
    // The native token needs no lookup.
    if (query.trim().toLowerCase() === NATIVE_TOKEN.symbol.toLowerCase()) return NATIVE_TOKEN;
    // The reader closes its MCP client when this signal aborts.
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    try {
      signal?.throwIfAborted();
      const tools = await read(owner, controller.signal);
      const tool = tools.get('get_token_balances');
      if (!tool) throw new Error('Onbloc tool get_token_balances is not available.');
      const decision = await tool.execute({});
      if (decision.kind !== 'result') {
        throw new Error(`get_token_balances failed (${decision.kind === 'denied' ? decision.code : decision.kind})`);
      }
      const { untrustedData } = resultSchema.parse(decision.value);
      return pickToken(query, untrustedData.items ?? []);
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
