import { NetworkFeeSettingType } from '@types';

export const MINIMUM_GAS_PRICE = 0.001 as const;

export const DEFAULT_GAS_USED = 100_000 as const;

export const DEFAULT_GAS_PRICE_STEP: Record<NetworkFeeSettingType, number> = {
  FAST: 0.004,
  AVERAGE: 0.0025,
  SLOW: 0.001,
} as const;

export const DEFAULT_GAS_ADJUSTMENT = 1.6 as const;

export const GAS_FEE_SAFETY_MARGIN = 1.2 as const;
