import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

const id = z.string().min(1).max(256);
const amount = z.string().regex(/^(0|[1-9][0-9]*)$/).max(78);
const positiveAmount = amount.refine(value => value !== '0');
const accountSchema = z.object({ account: id, chainId: id });
const asset = z.object({ assetId: id, symbol: id, decimals: z.number().int().min(0).max(255) });
const transfer = z.strictObject({ recipient: id, assetId: id, amount: positiveAmount });
const session = z.strictObject({ sessionId: id });

export const selectionSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('send'), ...transfer.shape }),
  z.strictObject({ kind: z.literal('revoke-session'), ...session.shape }),
]);

export const actionSchema = z.discriminatedUnion('kind', [
  selectionSchema.options[0].extend(accountSchema.shape),
  selectionSchema.options[1].extend(accountSchema.shape),
]);

export type WalletContext = Readonly<z.infer<typeof accountSchema>>;
export type Selection = z.infer<typeof selectionSchema>;
export type WalletAction = Readonly<Selection & WalletContext>;
export type Scope = 'read-only' | 'prepare-transfer' | 'manage-session';
export type WalletReader = {
  getBalances?(context: WalletContext, signal: AbortSignal): Promise<unknown>;
  findTokens?(context: WalletContext, symbol: string, signal: AbortSignal): Promise<unknown>;
  listSessions?(context: WalletContext, signal: AbortSignal): Promise<unknown>;
  getReceipt?(context: WalletContext, txId: string, signal: AbortSignal): Promise<unknown>;
};

const balances = accountSchema.extend({ balances: z.array(asset.extend({ amount })).max(500) });
const tokens = z.object({ chainId: id, candidates: z.array(asset).max(100) });
const sessions = accountSchema.extend({ sessions: z.array(z.object({ sessionId: id, expiresAt: z.number().int().nonnegative() })).max(100) });
const receipt = accountSchema.extend({ txId: id, status: z.enum(['succeeded', 'failed', 'pending']), blockHeight: amount.optional(), memo: z.string().max(4096).optional() });

const definitions = {
  get_balances: { effect: 'read', description: 'Read balances of the active wallet on the active chain.', schema: z.strictObject({}) },
  find_tokens: { effect: 'read', description: 'Find assets by symbol on the active chain; do not guess between matches.', schema: z.strictObject({ symbol: id }) },
  draft_send: { effect: 'propose', description: 'Prepare a transfer draft. Never signs or submits it.', schema: transfer },
  list_sessions: { effect: 'read', description: 'List session cards of the active wallet.', schema: z.strictObject({}) },
  revoke_session: { effect: 'session', description: 'Request wallet approval to revoke a specific session card.', schema: session },
  get_receipt: { effect: 'read', description: 'Read the chain receipt for a transaction in the active wallet.', schema: z.strictObject({ txId: id }) },
} as const;

export type ToolName = keyof typeof definitions;
export type ToolDefinition = Readonly<{ name: string; description: string } &
  ({ inputSchema: z.ZodType } | { jsonSchema: Tool['inputSchema'] })>;
export type Decision =
  | { kind: 'result'; value: unknown }
  | { kind: 'clarify'; reason: 'AMBIGUOUS_ASSET' | 'CONFIRM_TRANSFER' | 'CONFIRM_SESSION'; choices?: readonly z.infer<typeof asset>[] }
  | { kind: 'approval-required'; action: WalletAction }
  | { kind: 'denied'; code: 'UNKNOWN_TOOL' | 'OUT_OF_SCOPE' | 'INVALID_INPUT' | 'INVALID_OUTPUT' | 'TARGET_CHANGED' | 'CANCELLED' | 'BUDGET_EXHAUSTED' | 'RUN_PAUSED' | 'WALLET_UNAVAILABLE' | 'MCP_UNAVAILABLE' | 'MCP_TOOL_ERROR' | 'MCP_RESULT_TOO_LARGE' };

/** A tool offered by an external source (an MCP server): how it looks to the model, and how to run it. */
export type RemoteTool = Readonly<{
  definition: { name: string; description: string; jsonSchema: Tool['inputSchema'] };
  execute(raw: unknown): Promise<Decision>;
}>;

/**
 * Finds the remote tools for a run's account and chain. Returns none when the source does not
 * serve them (another chain, an invalid account). Closes its connection when `signal` aborts.
 */
export type ToolSource = (context: WalletContext, signal: AbortSignal) => Promise<ReadonlyMap<string, RemoteTool>>;

const names = Object.keys(definitions) as ToolName[];
export function isTool(name: string): name is ToolName {
  return Object.hasOwn(definitions, name);
}

export function allowed(scope: Scope, name: ToolName): boolean {
  switch (definitions[name].effect) {
    case 'read': return scope === 'read-only' || scope === 'prepare-transfer' || scope === 'manage-session';
    case 'propose': return scope === 'prepare-transfer';
    case 'session': return scope === 'manage-session';
  }
}

export type RunPurpose = 'wallet-balance' | 'transfer-draft' | 'mainnet-read';

const walletMethod: Partial<Record<ToolName, keyof WalletReader>> = {
  get_balances: 'getBalances', find_tokens: 'findTokens', list_sessions: 'listSessions', get_receipt: 'getReceipt',
};

export function toolsFor(scope: Scope, wallet: WalletReader, purpose?: RunPurpose): ToolDefinition[] {
  return names.filter(name => {
    const method = walletMethod[name];
    if (!allowed(scope, name)) return false;
    if (purpose === 'mainnet-read' || (purpose === 'wallet-balance' && name !== 'get_balances') ||
      (purpose === 'transfer-draft' && name !== 'draft_send')) return false;
    return !method || typeof wallet[method] === 'function';
  })
    .map(name => ({ name, description: definitions[name].description, inputSchema: definitions[name].schema }));
}

export async function evaluate(name: ToolName, raw: unknown, context: WalletContext, selection: Selection | undefined, wallet: WalletReader, signal: AbortSignal): Promise<Decision> {
  switch (name) {
    case 'get_balances': {
      if (!definitions[name].schema.safeParse(raw).success) return { kind: 'denied', code: 'INVALID_INPUT' };
      const result = balances.safeParse(await wallet.getBalances?.(context, signal));
      return result.success && matches(result.data, context) ? { kind: 'result', value: result.data } : invalidOutput();
    }
    case 'find_tokens': {
      const input = definitions[name].schema.safeParse(raw);
      if (!input.success) return { kind: 'denied', code: 'INVALID_INPUT' };
      const result = tokens.safeParse(await wallet.findTokens?.(context, input.data.symbol, signal));
      if (!result.success || result.data.chainId !== context.chainId) return invalidOutput();
      if (result.data.candidates.length > 1) return { kind: 'clarify', reason: 'AMBIGUOUS_ASSET', choices: result.data.candidates };
      return { kind: 'result', value: result.data };
    }
    case 'draft_send': {
      const input = transfer.safeParse(raw);
      if (!input.success) return { kind: 'denied', code: 'INVALID_INPUT' };
      if (selection?.kind !== 'send') return { kind: 'clarify', reason: 'CONFIRM_TRANSFER' };
      if (input.data.assetId !== selection.assetId || input.data.recipient !== selection.recipient || input.data.amount !== selection.amount) {
        return { kind: 'denied', code: 'TARGET_CHANGED' };
      }
      return { kind: 'result', value: { kind: 'draft', action: Object.freeze({ ...context, ...selection }) } };
    }
    case 'list_sessions': {
      if (!definitions[name].schema.safeParse(raw).success) return { kind: 'denied', code: 'INVALID_INPUT' };
      const result = sessions.safeParse(await wallet.listSessions?.(context, signal));
      return result.success && matches(result.data, context) ? { kind: 'result', value: result.data } : invalidOutput();
    }
    case 'revoke_session': {
      const input = session.safeParse(raw);
      if (!input.success) return { kind: 'denied', code: 'INVALID_INPUT' };
      if (selection?.kind !== 'revoke-session') return { kind: 'clarify', reason: 'CONFIRM_SESSION' };
      if (input.data.sessionId !== selection.sessionId) return { kind: 'denied', code: 'TARGET_CHANGED' };
      return { kind: 'approval-required', action: Object.freeze({ ...context, ...selection }) };
    }
    case 'get_receipt': {
      const input = definitions[name].schema.safeParse(raw);
      if (!input.success) return { kind: 'denied', code: 'INVALID_INPUT' };
      const result = receipt.safeParse(await wallet.getReceipt?.(context, input.data.txId, signal));
      if (!result.success || !matches(result.data, context) || result.data.txId !== input.data.txId) return invalidOutput();
      const { memo, ...record } = result.data;
      return { kind: 'result', value: { record, ...(memo === undefined ? {} : { untrustedData: { memo } }) } };
    }
  }
}

function matches(value: WalletContext, context: WalletContext) {
  return value.account === context.account && value.chainId === context.chainId;
}

function invalidOutput(): Decision {
  return { kind: 'denied', code: 'INVALID_OUTPUT' };
}
