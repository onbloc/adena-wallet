import { z } from 'zod';
import type { HarnessRun, ToolDefinition } from '../harness/core';
import { fromBaseUnits } from './wallet/amount';

const symbol = z.string().trim().min(1).max(64).regex(/^[\p{L}\p{N}._-]+$/u);
const assetId = z.string().trim().min(1).max(256).regex(/^[\p{L}\p{N}._:/-]+$/u);
const assetReference = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('symbol'), value: symbol }),
  z.strictObject({ kind: z.literal('id'), value: assetId }),
]);

/** A structured request, independent of how a user expressed it. */
export const balanceRequestSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('all') }),
  z.strictObject({ kind: z.literal('one'), asset: assetReference }),
]);
export type BalanceRequest = z.infer<typeof balanceRequestSchema>;

const balanceAssetSchema = z.strictObject({
  kind: z.enum(['native', 'token']),
  assetId,
  symbol,
  amount: z.string().regex(/^\d{1,78}$/),
  decimals: z.number().int().min(0).max(255),
});
export type BalanceAsset = z.infer<typeof balanceAssetSchema>;
export type BalanceScope = 'native' | 'tokens';

const scopesSchema = z.array(z.enum(['native', 'tokens'])).max(2)
  .refine(scopes => new Set(scopes).size === scopes.length);
const balanceReadSchema = z.strictObject({
  assets: z.array(balanceAssetSchema).max(500),
  missing: scopesSchema,
});
export type BalanceRead = z.infer<typeof balanceReadSchema>;

type BalanceRun = Pick<HarnessRun, 'dispatch' | 'signal' | 'context'>;

/** A trusted provider adapter may only obtain data through this run's dispatch. */
export type BalanceAdapter = Readonly<{
  /** Provider-specific raw tools hidden from the model in favor of get_balance. */
  toolNames: readonly string[];
  isAvailable(tools: readonly ToolDefinition[]): boolean;
  read(run: BalanceRun, request: BalanceRequest): Promise<BalanceRead>;
}>;

function matches(asset: BalanceAsset, request: Extract<BalanceRequest, { kind: 'one' }>): boolean {
  return request.asset.kind === 'id'
    ? asset.assetId === request.asset.value
    : asset.symbol.toLowerCase() === request.asset.value.toLowerCase();
}

const resultShape = z.strictObject({
  account: z.string().min(1).max(256),
  chainId: z.string().min(1).max(256),
  request: balanceRequestSchema,
  status: z.enum(['complete', 'partial', 'ambiguous', 'unavailable']),
  assets: z.array(balanceAssetSchema).max(500),
  missing: scopesSchema,
});

/** Also checks that a purported complete result actually satisfies its structured request. */
export const balanceResultSchema = resultShape.refine(result => {
  const keys = result.assets.map(asset => `${asset.kind}:${asset.assetId}`);
  if (new Set(keys).size !== keys.length) return false;
  const request = result.request;
  if (request.kind === 'one' && result.assets.some(asset => !matches(asset, request))) return false;
  if (result.status === 'complete') {
    return result.missing.length === 0 && (request.kind === 'all' || result.assets.length === 1);
  }
  if (result.status === 'partial') {
    return result.missing.length > 0 && (request.kind === 'all' || result.assets.length === 1);
  }
  if (result.status === 'ambiguous') return request.kind === 'one' && result.assets.length > 1;
  return result.assets.length === 0;
});
export type BalanceResult = z.infer<typeof balanceResultSchema>;

export const balanceToolDefinition: ToolDefinition = {
  name: 'get_balance',
  description: 'Read one identified asset balance or all balances for the current account. Use an asset ID to distinguish tokens with the same symbol.',
  inputSchema: balanceRequestSchema,
};

/** Uses the existing run: its account, chain, scope, cancellation, budget and audit still apply. */
export async function getBalance(
  run: BalanceRun,
  request: BalanceRequest,
  { account, chainId, adapter }: { account: string; chainId: string; adapter: BalanceAdapter }
): Promise<BalanceResult> {
  const parsedRequest = balanceRequestSchema.parse(request);
  if (!account || !chainId || account !== run.context.account || chainId !== run.context.chainId) {
    throw new TypeError('Balance context does not match the harness run.');
  }

  if (run.signal.aborted) {
    return { account, chainId, request: parsedRequest, status: 'unavailable', assets: [], missing: ['native', 'tokens'] };
  }
  const parsed = balanceReadSchema.safeParse(await adapter.read(run, parsedRequest));
  if (run.signal.aborted || !parsed.success) {
    return { account, chainId, request: parsedRequest, status: 'unavailable', assets: [], missing: ['native', 'tokens'] };
  }

  // Conflicting or repeated IDs cannot establish an exact amount for that source.
  const seen = new Set<string>();
  const invalid = new Set<BalanceScope>();
  for (const asset of parsed.data.assets) {
    const key = `${asset.kind}:${asset.assetId}`;
    if (seen.has(key)) invalid.add(asset.kind === 'native' ? 'native' : 'tokens');
    seen.add(key);
  }
  const missing = Array.from(new Set([...parsed.data.missing, ...invalid]));
  const valid = parsed.data.assets.filter(asset => !invalid.has(asset.kind === 'native' ? 'native' : 'tokens'));
  const assets = parsedRequest.kind === 'one' ? valid.filter(asset => matches(asset, parsedRequest)) : valid;
  const status = parsedRequest.kind === 'one' && assets.length > 1 ? 'ambiguous'
    : parsedRequest.kind === 'one' && assets.length === 0 ? 'unavailable'
      : missing.length === 2 && assets.length === 0 ? 'unavailable'
        : missing.length > 0 ? 'partial' : 'complete';
  return { account, chainId, request: parsedRequest, status, assets, missing };
}

function displayAsset(asset: BalanceAsset): string {
  const amount = fromBaseUnits(BigInt(asset.amount), asset.decimals);
  return asset.kind === 'native' ? `${amount} ${asset.symbol}` : `${amount} ${asset.symbol} (${asset.assetId})`;
}

/** Render only validated units and identify missing or ambiguous evidence explicitly. */
export function formatBalance(result: BalanceResult): string {
  const { request, assets, missing, status } = balanceResultSchema.parse(result);
  const missingText = missing.length ? `Could not verify: ${missing.map(scope => scope === 'native' ? 'native balance' : 'token balances').join(', ')}.` : '';
  if (status === 'unavailable') {
    const target = request.kind === 'one' ? request.asset.value : 'all';
    return missing.length ? `Could not verify ${target} balance${request.kind === 'all' ? 's' : ''}. ${missingText}`
      : `No ${target} balance was returned for this account.`;
  }
  if (status === 'ambiguous') {
    return [`Multiple assets match ${request.kind === 'one' ? request.asset.value : 'the request'}. Choose an asset ID:`,
      ...assets.map(asset => `- ${displayAsset(asset)}${asset.kind === 'native' ? ` (${asset.assetId})` : ''}`),
      ...(missingText ? [missingText] : [])].join('\n');
  }
  if (request.kind === 'one') return [displayAsset(assets[0]), missingText].filter(Boolean).join('\n\n');

  const native = assets.filter(asset => asset.kind === 'native').map(displayAsset);
  const tokens = assets.filter(asset => asset.kind === 'token');
  const tokenSection = tokens.length ? ['Token balances:', ...tokens.map(asset => `- ${displayAsset(asset)}`)].join('\n')
    : missing.includes('tokens') ? '' : 'No token balances returned.';
  return [...native, tokenSection, missingText].filter(Boolean).join('\n\n');
}
