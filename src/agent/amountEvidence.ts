// Parse only explicit, lossless amount evidence. Ambiguous or unsupported wording fails closed.
import { normalizeDecimal } from './wallet/amount';

const signedAmount = /(?:\b(?:minus|negative|plus)\s+|(?:마이너스|음수)\s*|(?<![\p{L}\p{N}_])[-+−]\s*)(?:\d|[a-z]+|[가-힣]+)/iu;
const number = /(?<![\p{L}\p{N}_./+-])\d+(?:\.\d+)?(?=$|[^\p{L}\p{N}_./%]|\p{Script=Hangul})/gu;
const ratio = /(?<![\p{L}\p{N}_./-])(\d{1,78})\s*\/\s*(\d{1,78})(?![\p{L}\p{N}_./-])/gu;
const koreanRatio = /(?<![\p{L}\p{N}_./+-])(\d{1,78})\s*분의\s*(\d{1,78})(?=$|[^\p{L}\p{N}_./%]|\p{Script=Hangul})/gu;
const percent = /(?<![\p{L}\p{N}_./-])(\d{1,40})(?:\.(\d{1,38}))?\s*%(?=$|[^\p{L}\p{N}_]|\p{Script=Hangul})/gu;
const englishShare = /\b(?:half|quarter|third|all)\b/giu;
const koreanShare = /절반|전부|모두|전체|(?<![가-힣])반(?=$|[^가-힣]|[을를이가])/gu;
const hasShare = (text: string) => [...text.matchAll(ratio)].length > 0
  || [...text.matchAll(koreanRatio)].length > 0 || [...text.matchAll(percent)].length > 0
  || [...text.matchAll(englishShare)].length > 0 || [...text.matchAll(koreanShare)].length > 0;
const englishBalanceShare = /(?:\b(?:half|quarter|third|all)\b|\d+\s*\/\s*\d+|\d+(?:\.\d+)?\s*%)\s+(?:of\s+)?(?:my\b|the\s+(?:balance|holdings)\b)/iu;
const koreanBalanceShare = /(?<![가-힣])(?:내|나의|제)\s*[\p{L}\p{N}._/-]+(?:의)?\s*(?:절반|전부|모두|전체|반|\d+\s*분의\s*\d+|\d+(?:\.\d+)?\s*%)/u;
const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const englishNumbers: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const koreanNumbers: Record<string, number> = {
  한: 1, 두: 2, 세: 3, 네: 4, 다섯: 5, 여섯: 6, 일곱: 7, 여덟: 8, 아홉: 9, 열: 10,
};
const englishNumber = /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:[- ](one|two|three|four|five|six|seven|eight|nine))?(?:\s+and\s+(?:a\s+)?(half))?\b(?!\s+(?:hundred|thousand|million|billion|point)\b)/giu;
const koreanNumber = /(?<![가-힣])(한|두|세|네|다섯|여섯|일곱|여덟|아홉|열)\s*개(?:\s*(반))?/gu;
const koreanMixedNumber = /(?<![\p{L}\p{N}_./+-])(\d{1,39})\s*개\s*반/gu;
type WordAmount = { start: number; end: number; value: string; mixed: boolean };

function wordAmounts(text: string): WordAmount[] {
  const amounts: WordAmount[] = [];
  for (const match of text.matchAll(englishNumber)) {
    const first = englishNumbers[match[1].toLowerCase()];
    if (match[2] && (first < 20 || first % 10 !== 0)) continue;
    const integer = first + (match[2] ? englishNumbers[match[2].toLowerCase()] : 0);
    amounts.push({ start: match.index, end: match.index + match[0].length,
      value: `${integer}${match[3] ? '.5' : ''}`, mixed: !!match[3] });
  }
  for (const match of text.matchAll(koreanNumber)) {
    amounts.push({ start: match.index, end: match.index + match[0].length,
      value: `${koreanNumbers[match[1]]}${match[2] ? '.5' : ''}`, mixed: !!match[2] });
  }
  for (const match of text.matchAll(koreanMixedNumber)) {
    amounts.push({ start: match.index, end: match.index + match[0].length,
      value: `${BigInt(match[1])}.5`, mixed: true });
  }
  return amounts;
}

function paired(text: string, amount: WordAmount, asset: string): boolean {
  if (!asset) return false;
  const escaped = escapeRegex(asset);
  const before = new RegExp(`(?:^|[^\\p{L}\\p{N}_/.-])${escaped}\\s*$`, 'iu');
  const after = new RegExp(`^\\s+${escaped}(?=$|[^\\p{L}\\p{N}_/]|\\p{Script=Hangul})`, 'iu');
  return before.test(text.slice(0, amount.start)) || after.test(text.slice(amount.end));
}

function withoutMixedNumbers(text: string, amounts: readonly WordAmount[]): string {
  const mixed = amounts.filter(amount => amount.mixed).sort((a, b) => b.start - a.start);
  for (const amount of mixed) text = text.slice(0, amount.start) + ' ' + text.slice(amount.end);
  return text;
}

/** An explicitly described share of a balance, never an inferred absolute token amount. */
export function balanceShareEvidence(text: string): { numerator: string; denominator: string } | undefined {
  if (signedAmount.test(text) || !(englishBalanceShare.test(text) || koreanBalanceShare.test(text))
    || wordAmounts(text).some(amount => amount.mixed)) return undefined;
  const compound = /\b(zero|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:(and)\s+(?:a\s+)?)?(?:half|quarter|third)\b/iu.exec(text);
  if (compound && (compound[1].toLowerCase() !== 'one' || compound[2])) return undefined;
  const shares: [bigint, bigint][] = [];
  let remainder = text;
  for (const match of remainder.matchAll(koreanRatio)) shares.push([BigInt(match[2]), BigInt(match[1])]);
  remainder = remainder.replace(koreanRatio, ' ');
  for (const match of remainder.matchAll(ratio)) shares.push([BigInt(match[1]), BigInt(match[2])]);
  remainder = remainder.replace(ratio, ' ');
  for (const match of remainder.matchAll(percent)) {
    const decimals = match[2] ?? '';
    shares.push([BigInt(match[1] + decimals), 100n * 10n ** BigInt(decimals.length)]);
  }
  remainder = remainder.replace(percent, ' ');
  for (const match of remainder.matchAll(englishShare)) {
    const denominator = ({ half: 2n, quarter: 4n, third: 3n, all: 1n } as const)[match[0].toLowerCase() as 'half' | 'quarter' | 'third' | 'all'];
    shares.push([1n, denominator]);
  }
  remainder = remainder.replace(englishShare, ' ');
  for (const match of remainder.matchAll(koreanShare)) {
    shares.push([1n, match[0] === '절반' || match[0] === '반' ? 2n : 1n]);
  }
  remainder = remainder.replace(koreanShare, ' ');
  if (shares.length !== 1 || shares[0][1] === 0n || [...remainder.matchAll(number)].length) return undefined;
  return { numerator: shares[0][0].toString(), denominator: shares[0][1].toString() };
}

export function fractionEvidence(text: string, amount: { numerator: string; denominator: string }): boolean {
  const share = balanceShareEvidence(text);
  return !!share && BigInt(share.numerator) * BigInt(amount.denominator) === BigInt(amount.numerator) * BigInt(share.denominator);
}

// A self-correction replaces an earlier number only when the new amount is explicit.
// Keep all other numbers so alternatives and compound requests remain ambiguous.
function correctedAmountText(text: string): string {
  if (/["'“”‘’`]/u.test(text)) return text;
  const correction = /(?:,\s*(?:no\s+wait|actually)\s*,?\s*(?:make\s+it|use)\s+|,\s*아니\s*(?:잠깐)?\s*,?\s*)(\d+(?:\.\d+)?)(?=$|[^\p{L}\p{N}_./%]|\p{Script=Hangul})/iu.exec(text);
  if (!correction) return text;
  const before = text.slice(0, correction.index);
  const previous = [...before.matchAll(number)];
  if (previous.length !== 1 || signedAmount.test(text)) return text;
  const match = previous[0];
  return before.slice(0, match.index) + ' ' + before.slice(match.index! + match[0].length) + text.slice(correction.index);
}

export function exactAmountEvidence(text: string, value: string, asset = ''): boolean {
  if (signedAmount.test(text)) return false;
  text = correctedAmountText(text);
  const amounts = wordAmounts(text);
  const remainder = withoutMixedNumbers(text, amounts);
  if (hasShare(remainder)) return false;
  const words = amounts.filter(amount => paired(text, amount, asset));
  if (words.length) {
    return words.length === 1 && [...remainder.matchAll(number)].length === 0
      && normalizeDecimal(value) === words[0].value;
  }
  const numbers = [...remainder.matchAll(number)];
  return numbers.length > 0 && numbers.every(match => match[0] === value);
}

export function pairedDecimalAmount(text: string, asset: string): string | undefined {
  if (signedAmount.test(text)) return undefined;
  const amounts = wordAmounts(text);
  const remainder = withoutMixedNumbers(text, amounts);
  if (hasShare(remainder)) return undefined;
  const words = amounts.filter(amount => paired(text, amount, asset));
  const numbers = [...remainder.matchAll(number)];
  if (words.length === 1 && numbers.length === 0) return normalizeDecimal(words[0].value) ?? undefined;
  if (words.length || numbers.length !== 1 || !numbers[0][0].includes('.')) return undefined;
  const value = numbers[0][0];
  if (normalizeDecimal(value) === null) return undefined;
  const pair = new RegExp(`(?:${escapeRegex(value)}\\s+(?:of\\s+the\\s+token\\s+at\\s+)?${escapeRegex(asset)}|${escapeRegex(asset)}\\s+${escapeRegex(value)})(?=$|[^\\p{L}\\p{N}_/]|\\p{Script=Hangul})`, 'iu');
  return pair.test(remainder) ? value : undefined;
}
