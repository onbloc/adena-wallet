import { CHART_RANGES, ChartRange } from '../../../src/domain/market';

describe('CHART_RANGES', () => {
  it('lists every range in display order', () => {
    expect(CHART_RANGES).toEqual(['1H', '1D', '1W', '1M', '1Y']);
    expect(CHART_RANGES).toEqual(Object.values(ChartRange));
  });
});
