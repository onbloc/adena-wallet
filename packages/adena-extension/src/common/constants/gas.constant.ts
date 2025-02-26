import { NetworkFeeSettingType } from '@types';

// Gnoland default gas price (1ugnot/1000gas)
// https://github.com/gnolang/gno/blob/master/gno.land/pkg/gnoland/genesis.go#L20
export const MINIMUM_GAS_PRICE = 0.001 as const;

// Adena default gas used
// When the gas used is not set, the default value is 10,000,000
export const DEFAULT_GAS_USED = 10_000_000 as const;

// Default gas price step
// Slow = 0.001, Average = 0.0025, Fast = 0.004
export const DEFAULT_GAS_PRICE_STEP: Record<NetworkFeeSettingType, number> = {
  FAST: 0.004,
  AVERAGE: 0.0025,
  SLOW: 0.001,
} as const;

// Default gas adjustment
export const DEFAULT_GAS_ADJUSTMENT = 1 as const;

// Gas fee safety margin
// This is gas wanted safety margin
export const GAS_FEE_SAFETY_MARGIN = 1.2 as const;
