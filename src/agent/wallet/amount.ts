// Decimal strings <-> bigint base units. No floats anywhere.

const DECIMAL = /^\d+(\.\d+)?$/;
const MAX_LENGTH = 40; // bounds BigInt size for untrusted model output

/** Canonical form ("0.50" -> "0.5", "007" -> "7"); null if not a plain non-negative decimal. */
export function normalizeDecimal(input: string): string | null {
  const value = input.trim();
  if (value.length === 0 || value.length > MAX_LENGTH || !DECIMAL.test(value)) {
    return null;
  }
  const [integer, fraction = ''] = value.split('.');
  const int = integer.replace(/^0+(?=\d)/, '');
  const frac = fraction.replace(/0+$/, '');
  return frac ? `${int}.${frac}` : int;
}

/** Null if invalid or if it has more fractional digits than the token supports. */
export function toBaseUnits(input: string, decimals: number): bigint | null {
  const normalized = normalizeDecimal(input);
  if (normalized === null) return null;
  const [integer, fraction = ''] = normalized.split('.');
  if (fraction.length > decimals) return null;
  return BigInt(integer + fraction.padEnd(decimals, '0'));
}

/** Non-negative units only. */
export function fromBaseUnits(units: bigint, decimals: number): string {
  const digits = units.toString().padStart(decimals + 1, '0');
  const integer = digits.slice(0, digits.length - decimals);
  const fraction = digits.slice(digits.length - decimals).replace(/0+$/, '');
  return fraction ? `${integer}.${fraction}` : integer;
}
