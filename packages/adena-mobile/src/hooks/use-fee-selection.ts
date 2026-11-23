import { useMemo, useState } from 'react';

import { FeeOptionView, FeeSelectorProps } from '../components/molecules';
import { ComputedFee, computeFee, DEFAULT_FEE_SELECTION, FeeEstimate, FeeTier } from '../domain/fee';
import { Network } from '../domain/network';
import { formatTokenAmount } from '../utils/amount';

const TIER_LABEL: Record<FeeTier, string> = { SLOW: 'Slow', AVERAGE: 'Average', FAST: 'Fast', CUSTOM: 'Custom' };
const TIERS: FeeTier[] = Object.values(FeeTier);

// Tier selection over one simulation; switching tiers never re-simulates.
export interface UseFeeSelectionReturn {
  fee: ComputedFee | null;
  selectorProps: FeeSelectorProps;
  reset: () => void;
}

export const useFeeSelection = (estimate: FeeEstimate | null, network: Network): UseFeeSelectionReturn => {
  const [tier, setTier] = useState<FeeTier>(DEFAULT_FEE_SELECTION.tier);
  const [customAdjustment, setCustomAdjustment] = useState('1.5');

  const adjustmentFor = (value: FeeTier): number => (value === FeeTier.CUSTOM ? Number(customAdjustment) : 1);
  const native = network.feeToken;

  const fee: ComputedFee | null = useMemo(
    () => (estimate ? computeFee(estimate, { tier, adjustment: tier === FeeTier.CUSTOM ? Number(customAdjustment) : 1 }) : null),
    [estimate, tier, customAdjustment],
  );

  const options: FeeOptionView[] = estimate
    ? TIERS.map((value) => {
        const computed = computeFee(estimate, { tier: value, adjustment: adjustmentFor(value) });
        const amount = computed.gasFee.replace(estimate.denom, '');

        return { tier: value, label: TIER_LABEL[value], feeLabel: `${formatTokenAmount(amount, native.decimals)} ${native.symbol}` };
      })
    : [];

  const selectorProps: FeeSelectorProps = {
    options,
    selected: tier,
    onSelect: setTier,
    customAdjustment,
    onChangeCustomAdjustment: setCustomAdjustment,
    tooLow: Boolean(fee?.tooLow),
  };

  return { fee, selectorProps, reset: (): void => setTier(DEFAULT_FEE_SELECTION.tier) };
};
