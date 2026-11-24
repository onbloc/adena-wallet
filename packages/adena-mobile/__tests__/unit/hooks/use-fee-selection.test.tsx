import { act, renderHook } from '@testing-library/react-native';

import { FeeEstimate, FeeTier, GNO_FEE_POLICY } from '../../../src/domain/fee';
import { useFeeSelection } from '../../../src/hooks/use-fee-selection';
import { BUILT_IN_NETWORKS } from '../../../src/resources';

const network = BUILT_IN_NETWORKS[0];
const estimate: FeeEstimate = { gasUsed: '1000000', gasPrice: '0.001', denom: 'ugnot', policy: GNO_FEE_POLICY };

describe('useFeeSelection', () => {
  it('has no fee or options without an estimate', async () => {
    const { result } = await renderHook(() => useFeeSelection(null, network));

    expect(result.current.fee).toBeNull();
    expect(result.current.selectorProps).toMatchObject({ options: [], selected: FeeTier.AVERAGE, tooLow: false });
  });

  it('lists every tier and switches without re-simulating', async () => {
    const { result } = await renderHook(() => useFeeSelection(estimate, network));

    expect(result.current.selectorProps.options.map(option => option.label)).toEqual(['Slow', 'Average', 'Fast', 'Custom']);
    expect(result.current.selectorProps.options[0].feeLabel).toMatch(new RegExp(`${network.feeToken.symbol}$`));
    expect(result.current.fee?.gasWanted).toBe('1100000');
    await act(async () => result.current.selectorProps.onSelect(FeeTier.FAST));
    expect(result.current.fee?.gasWanted).toBe('1200000');
    await act(async () => result.current.reset());
    expect(result.current.selectorProps.selected).toBe(FeeTier.AVERAGE);
  });

  it('applies the custom multiplier and flags a too-low budget', async () => {
    const { result } = await renderHook(() => useFeeSelection(estimate, network));

    await act(async () => result.current.selectorProps.onSelect(FeeTier.CUSTOM));
    expect(result.current.fee?.gasWanted).toBe('1500000');
    await act(async () => result.current.selectorProps.onChangeCustomAdjustment('0.5'));
    expect(result.current.selectorProps.customAdjustment).toBe('0.5');
    expect(result.current.fee?.tooLow).toBe(true);
    expect(result.current.selectorProps.tooLow).toBe(true);
  });

  it('treats an invalid custom multiplier as 1', async () => {
    const { result } = await renderHook(() => useFeeSelection(estimate, network));

    await act(async () => {
      result.current.selectorProps.onSelect(FeeTier.CUSTOM);
      result.current.selectorProps.onChangeCustomAdjustment('abc');
    });
    expect(result.current.fee?.gasWanted).toBe('1000000');
    expect(result.current.fee?.tooLow).toBe(false);
  });
});
