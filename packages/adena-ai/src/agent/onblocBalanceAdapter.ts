import { z } from 'zod';
import type { BalanceAdapter, BalanceAsset, BalanceRequest, BalanceScope } from './balanceOperation';

const nativeTool = 'get_native_balance';
const tokensTool = 'get_token_balances';
const toolNames = [nativeTool, tokensTool] as const;
const units = z.string().regex(/^\d{1,78}$/);
const symbol = z.string().min(1).max(64).regex(/^[\p{L}\p{N}._-]+$/u);
const id = z.string().min(1).max(256).regex(/^[\p{L}\p{N}._:/-]+$/u);
const identity = z.object({ address: z.string(), network: z.string().optional() });
const native = identity.extend({ denom: z.literal('ugnot'), balance: units });
const entry = z.object({
  address: z.string().optional(),
  packagePath: id.optional(),
  tokenId: id.optional(),
  symbol,
  amount: units,
  decimals: z.number().int().min(0).max(255),
}).refine(item => item.packagePath !== undefined || item.tokenId !== undefined);
const tokens = identity.extend({ items: z.array(z.unknown()).max(500).nullable() });
const envelope = z.object({
  kind: z.literal('result'),
  value: z.object({ chainId: z.string(), untrustedData: z.unknown() }),
});

// An explicit continuation is evidence that the returned list is only a page, not a portfolio.
const page = z.object({
  nextCursor: z.string().nullable().optional(),
  next_cursor: z.string().nullable().optional(),
  nextPage: z.union([z.string(), z.number().int().nonnegative(), z.null()]).optional(),
  next_page: z.union([z.string(), z.number().int().nonnegative(), z.null()]).optional(),
  hasMore: z.boolean().optional(),
  has_more: z.boolean().optional(),
  hasNextPage: z.boolean().optional(),
  total: z.number().int().nonnegative().optional(),
  totalCount: z.number().int().nonnegative().optional(),
  total_count: z.number().int().nonnegative().optional(),
  page: z.number().int().nonnegative().optional(),
  totalPages: z.number().int().nonnegative().optional(),
});

function pageIsComplete(data: unknown, count: number): boolean {
  const object = z.record(z.string(), z.unknown()).safeParse(data);
  if (!object.success) return false;
  for (const value of [object.data, object.data.pagination, object.data.pageInfo]) {
    if (value === undefined || value === null) continue;
    const parsed = page.safeParse(value);
    if (!parsed.success) return false;
    const info = parsed.data;
    if (info.hasMore || info.has_more || info.hasNextPage || info.nextCursor || info.next_cursor ||
      (info.nextPage !== undefined && info.nextPage !== null && info.nextPage !== '') ||
      (info.next_page !== undefined && info.next_page !== null && info.next_page !== '') ||
      [info.total, info.totalCount, info.total_count].some(total => total !== undefined && total > count) ||
      (info.page !== undefined && info.totalPages !== undefined && info.page < info.totalPages)) return false;
  }
  return true;
}

function sources(request: BalanceRequest): BalanceScope[] {
  if (request.kind === 'all') return ['native', 'tokens'];
  const { asset } = request;
  return (asset.kind === 'symbol' && asset.value.toUpperCase() === 'GNOT') ||
    (asset.kind === 'id' && asset.value === 'ugnot') ? ['native'] : ['tokens'];
}

/** Provider-specific normalization; policy and call accounting remain in run.dispatch. */
export const onblocBalanceAdapter: BalanceAdapter = {
  toolNames,
  async read(run, request) {
    const assets: BalanceAsset[] = [];
    const missing: BalanceScope[] = [];
    for (const scope of sources(request)) {
      if (run.signal.aborted) {
        missing.push(scope);
        continue;
      }
      const output = await run.dispatch({ name: scope === 'native' ? nativeTool : tokensTool, input: {} });
      const result = envelope.safeParse(output);
      if (!result.success || result.data.value.chainId !== run.context.chainId) {
        missing.push(scope);
        continue;
      }
      const data = result.data.value.untrustedData;
      const details = identity.safeParse(data);
      if (!details.success || details.data.address !== run.context.account ||
        (details.data.network !== undefined && details.data.network !== run.context.chainId)) {
        missing.push(scope);
        continue;
      }
      if (scope === 'native') {
        const parsed = native.safeParse(data);
        if (!parsed.success) {
          missing.push(scope);
          continue;
        }
        assets.push({ kind: 'native', assetId: parsed.data.denom, symbol: 'GNOT', amount: parsed.data.balance, decimals: 6 });
      } else {
        const parsed = tokens.safeParse(data);
        if (!parsed.success) {
          missing.push(scope);
          continue;
        }
        const rawItems = parsed.data.items ?? [];
        const items = rawItems.flatMap(raw => { const item = entry.safeParse(raw); return item.success ? [item.data] : []; });
        if (items.some(item => item.address !== undefined && item.address !== run.context.account)) {
          missing.push(scope);
          continue;
        }
        for (const item of items) {
          assets.push({ kind: 'token', assetId: (item.tokenId ?? item.packagePath)!, symbol: item.symbol, amount: item.amount, decimals: item.decimals });
        }
        // A dropped item means the portfolio is incomplete.
        if (items.length !== rawItems.length || !pageIsComplete(data, rawItems.length)) missing.push(scope);
      }
    }
    return { assets, missing };
  },
};
