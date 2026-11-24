import { BigNumber } from '../utils/big-number';
import { TransactionFee } from './transaction';

export const FeeTier = {
  SLOW: 'SLOW',
  AVERAGE: 'AVERAGE',
  FAST: 'FAST',
  CUSTOM: 'CUSTOM',
} as const;

export type FeeTier = (typeof FeeTier)[keyof typeof FeeTier];

export const FeeRateTarget = {
  GAS: 'gas',
  PRICE: 'price',
} as const;

export type FeeRateTarget = (typeof FeeRateTarget)[keyof typeof FeeRateTarget];

// Single simulation result; every tier is derived from it without re-simulating.
export interface FeePolicy {
  // Multiplier applied to gasUsed before tiers (Cosmos 1.3, Gno 1).
  gasMargin: number;
  tierRates: Record<Exclude<FeeTier, typeof FeeTier.CUSTOM>, number>;
  // Gno scales the gas budget per tier; Cosmos scales the gas price.
  rateTarget: FeeRateTarget;
}

export interface FeeEstimate {
  gasUsed: string;
  // Net storage deposit (locked minus released) in the fee token's smallest unit; Gno only.
  storageDeposit?: string;
  // Price per gas unit in the smallest unit of `denom`, as a decimal string.
  gasPrice: string;
  denom: string;
  policy: FeePolicy;
}

export interface FeeSelection {
  tier: FeeTier;
  // Extra multiplier applied on top of the tier rate (the extension's "gas adjustment").
  adjustment: number;
}

// Extension parity: Gno tiers scale gas (1.0 / 1.1 / 1.2), Cosmos tiers scale price (1.0 / 1.2 / 1.5) after a 1.3 gas margin.
export const GNO_FEE_POLICY: FeePolicy = { gasMargin: 1, tierRates: { SLOW: 1, AVERAGE: 1.1, FAST: 1.2 }, rateTarget: FeeRateTarget.GAS };
export const COSMOS_FEE_POLICY: FeePolicy = { gasMargin: 1.3, tierRates: { SLOW: 1, AVERAGE: 1.2, FAST: 1.5 }, rateTarget: FeeRateTarget.PRICE };

export const DEFAULT_FEE_SELECTION: FeeSelection = { tier: FeeTier.AVERAGE, adjustment: 1 };

export interface ComputedFee extends TransactionFee {
  // True when the budget is below the simulated usage and the tx would run out of gas.
  tooLow: boolean;
}

export const computeFee = (estimate: FeeEstimate, selection: FeeSelection): ComputedFee => {
  const { policy } = estimate;
  const tierRate = selection.tier === FeeTier.CUSTOM ? 1 : policy.tierRates[selection.tier];
  const adjustment = Number.isFinite(selection.adjustment) && selection.adjustment > 0 ? selection.adjustment : 1;
  const rate = tierRate * adjustment;
  const baseGas = new BigNumber(estimate.gasUsed).multipliedBy(policy.gasMargin);
  const gasWanted = policy.rateTarget === FeeRateTarget.GAS
    ? baseGas.multipliedBy(rate).integerValue(BigNumber.ROUND_DOWN)
    : baseGas.integerValue(BigNumber.ROUND_CEIL);
  const price = new BigNumber(estimate.gasPrice).multipliedBy(policy.rateTarget === FeeRateTarget.PRICE ? rate : 1);
  const fee = gasWanted.multipliedBy(price).integerValue(BigNumber.ROUND_UP);

  return {
    gasWanted: gasWanted.toFixed(0),
    gasFee: `${fee.toFixed(0)}${estimate.denom}`,
    tooLow: gasWanted.isLessThan(estimate.gasUsed),
  };
};
