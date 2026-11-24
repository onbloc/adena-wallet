import { z } from 'zod';
import { fromBaseUnits } from './wallet/amount';

const units = z.string().regex(/^\d{1,78}$/);
const entry = z.object({
  symbol: z.string().min(1).max(64).regex(/^[\p{L}\p{N}._-]+$/u),
  tokenId: z.string().min(1).max(256).regex(/^[a-zA-Z0-9._/-]+$/),
  amount: units,
  decimals: z.number().int().min(0).max(255),
});
const native = z.object({ balance: units, denom: z.literal('ugnot') });
const tokens = z.object({ items: z.array(entry).max(100) });
const result = z.object({ kind: z.literal('result'), value: z.object({ untrustedData: z.unknown() }) });

/** Never ask the model to convert base units or classify wrapped assets as native. */
export function formatOnblocBalance(name: string, output: unknown): string | undefined {
  if (name !== 'get_native_balance' && name !== 'get_token_balances') return undefined;
  const parsed = result.safeParse(output);
  if (!parsed.success) return undefined;
  const data = parsed.data.value.untrustedData;
  if (name === 'get_native_balance') {
    const parsed = native.safeParse(data);
    return parsed.success ? `${fromBaseUnits(BigInt(parsed.data.balance), 6)} GNOT` : undefined;
  }
  const parsedTokens = tokens.safeParse(data);
  if (!parsedTokens.success) return undefined;
  if (!parsedTokens.data.items.length) return 'No GRC20 balances returned.';
  return ['GRC20 balances:', ...parsedTokens.data.items.map(({ amount, decimals, symbol, tokenId }) =>
    `- ${fromBaseUnits(BigInt(amount), decimals)} ${symbol} (${tokenId})`)].join('\n');
}
