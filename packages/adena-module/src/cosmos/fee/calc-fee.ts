import { StdFee } from '@cosmjs/amino';

export interface CalcFeeInput {
  gasUsed: number;
  gasMultiplier: number;
  minBaseGasPrice: string;
  feeDenom: string;
  gasSafetyMargin?: number;
}

export const DEFAULT_GAS_SAFETY_MARGIN = 1.3;

export const FEE_PRESET_MULTIPLIERS = {
  SLOW: 1.0,
  AVERAGE: 1.2,
  FAST: 1.5,
} as const;

/**
 * Derive a `StdFee` from simulated gas usage and the feemarket base gas price.
 *
 * gas_limit = ceil(gasUsed * gasSafetyMargin)
 * amount    = ceil(gas_limit * minBaseGasPrice * gasMultiplier)
 *
 * Computation is done with scaled BigInt integers to avoid the drift you
 * would get from multiplying an 18-decimal Dec by a JS float.
 */
export function calcFee({
  gasUsed,
  gasMultiplier,
  minBaseGasPrice,
  feeDenom,
  gasSafetyMargin = DEFAULT_GAS_SAFETY_MARGIN,
}: CalcFeeInput): StdFee {
  if (!Number.isFinite(gasUsed) || gasUsed <= 0) {
    throw new Error(`calcFee: invalid gasUsed=${gasUsed}`);
  }
  if (!Number.isFinite(gasMultiplier) || gasMultiplier <= 0) {
    throw new Error(`calcFee: invalid gasMultiplier=${gasMultiplier}`);
  }
  if (!feeDenom) {
    throw new Error('calcFee: feeDenom is required');
  }

  const gasLimit = Math.ceil(gasUsed * gasSafetyMargin);
  const amount = ceilGasLimitTimesDecTimesMultiplier(
    gasLimit,
    minBaseGasPrice,
    gasMultiplier,
  );

  return {
    amount: [{ denom: feeDenom, amount }],
    gas: gasLimit.toString(),
  };
}

const DEC_SCALE = 18;
const MULTIPLIER_SCALE = 6;
const TOTAL_SCALE = DEC_SCALE + MULTIPLIER_SCALE;

function ceilGasLimitTimesDecTimesMultiplier(
  gasLimit: number,
  priceDec: string,
  multiplier: number,
): string {
  const priceScaled = decStringToScaledBigInt(priceDec, DEC_SCALE);
  const multiplierScaled = BigInt(
    Math.round(multiplier * 10 ** MULTIPLIER_SCALE),
  );
  const product = BigInt(gasLimit) * priceScaled * multiplierScaled;
  // Divisor built from a string literal — BigInt ** is downleveled to
  // Math.pow by Jest's babel preset, and the project targets pre-ES2020.
  const divisor = BigInt('1' + '0'.repeat(TOTAL_SCALE));
  const quotient = product / divisor;
  const remainder = product % divisor;
  const ceil = remainder === BigInt(0) ? quotient : quotient + BigInt(1);
  return ceil.toString();
}

function decStringToScaledBigInt(dec: string, scale: number): bigint {
  if (!/^[0-9]+(\.[0-9]+)?$/.test(dec)) {
    throw new Error(`calcFee: invalid decimal string "${dec}"`);
  }
  const [intPart, fracPartRaw = ''] = dec.split('.');
  const fracPart = fracPartRaw.slice(0, scale).padEnd(scale, '0');
  return BigInt(intPart + fracPart);
}
