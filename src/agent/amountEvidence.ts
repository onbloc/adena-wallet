// Parse only explicit, lossless amount evidence. Ambiguous or unsupported wording fails closed.
const number = /(?<![\p{L}\p{N}_./+-])\d+(?:\.\d+)?(?=$|[^\p{L}\p{N}_./%]|\p{Script=Hangul})/gu;
const ratio = /(?<![\p{L}\p{N}_./-])(\d{1,78})\s*\/\s*(\d{1,78})(?![\p{L}\p{N}_./-])/gu;
const percent = /(?<![\p{L}\p{N}_./-])(\d{1,40})(?:\.(\d{1,38}))?\s*%(?![\p{L}\p{N}_])/gu;
const shareWord = /\b(?:half|quarter|third|all)\b/i;
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function fractionEvidence(text: string, amount: { numerator: string; denominator: string }): boolean {
  const shares: [bigint, bigint][] = [];
  for (const match of text.matchAll(ratio)) shares.push([BigInt(match[1]), BigInt(match[2])]);
  for (const match of text.matchAll(percent)) {
    const decimals = match[2] ?? '';
    shares.push([BigInt(match[1] + decimals), 100n * 10n ** BigInt(decimals.length)]);
  }
  if (/\bhalf\b/i.test(text)) shares.push([1n, 2n]);
  if (/\ball\s+(?:of\s+)?my\b/i.test(text)) shares.push([1n, 1n]);
  const remainder = text.replace(ratio, ' ').replace(percent, ' ')
    .replace(/\bhalf\b/gi, ' ').replace(/\ball\s+(?:of\s+)?my\b/gi, ' ');
  return shares.length === 1 && shares[0][1] !== 0n && !shareWord.test(remainder) && ![...remainder.matchAll(number)].length
    && shares[0][0] * BigInt(amount.denominator) === BigInt(amount.numerator) * shares[0][1];
}

export function exactAmountEvidence(text: string, value: string): boolean {
  if (shareWord.test(text) || [...text.matchAll(ratio)].length || [...text.matchAll(percent)].length) return false;
  return [...text.matchAll(number)].some(match => match[0] === value);
}

export function pairedDecimalAmount(text: string, asset: string): string | undefined {
  if (shareWord.test(text) || [...text.matchAll(ratio)].length || [...text.matchAll(percent)].length) return undefined;
  const numbers = [...text.matchAll(number)];
  if (numbers.length !== 1 || !numbers[0][0].includes('.')) return undefined;
  const value = numbers[0][0];
  const pair = new RegExp(`(?:${escapeRegex(value)}\\s+(?:of\\s+the\\s+token\\s+at\\s+)?${escapeRegex(asset)}|${escapeRegex(asset)}\\s+${escapeRegex(value)})(?![\\p{L}\\p{N}_/])`, 'iu');
  return pair.test(text) ? value : undefined;
}
