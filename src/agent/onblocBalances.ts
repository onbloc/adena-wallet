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

/** Only unambiguous, standalone balance questions take the read-only shortcut. */
export function requestedBalanceSymbol(text: string): string | undefined {
  const question = text.trim();
  const match = /^(?:(?:what(?:'s| is) (?:my |the )?)?([a-z][a-z0-9._-]{0,63}) balance|how much ([a-z][a-z0-9._-]{0,63}) do i (?:have|hold))[?!.]?$/i.exec(question)
    ?? /^(?:내(?:가 가진)?\s*)?([a-z][a-z0-9._-]{0,63})\s*(?:잔액|보유량)(?:은|는|이|을)?\s*(?:얼마(?:야|인가요|예요)?|알려\s*줘|보여\s*줘)?[?!.]?$/i.exec(question);
  const symbol = match?.[1] ?? match?.[2];
  return symbol && !/^(my|the|wallet|token|total|current|portfolio|account|native)$/i.test(symbol) ? symbol : undefined;
}

/** Never ask the model to convert base units or classify wrapped assets as native. */
export function formatOnblocBalance(name: string, output: unknown, symbol?: string): string | undefined {
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
  if (symbol) {
    const matches = parsedTokens.data.items.filter(item => item.symbol.toLowerCase() === symbol.toLowerCase());
    return matches.length ? matches.map(item => `${fromBaseUnits(BigInt(item.amount), item.decimals)} ${item.symbol} (${item.tokenId})`).join('\n')
      : `No ${symbol} balance was returned for this account.`;
  }
  if (!parsedTokens.data.items.length) return 'No GRC20 balances returned.';
  return ['GRC20 balances:', ...parsedTokens.data.items.map(({ amount, decimals, symbol, tokenId }) =>
    `- ${fromBaseUnits(BigInt(amount), decimals)} ${symbol} (${tokenId})`)].join('\n');
}
