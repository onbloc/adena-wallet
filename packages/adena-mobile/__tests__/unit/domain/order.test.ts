import {
  dcaTotal,
  firstRoundAt,
  limitMinimumOutput,
  nextSlotOffset,
  orderProgress,
  OrderStatus,
  orderStatus,
  priceOf,
  remainingInput,
  takingFromPrice,
  validateDcaInput,
  validateLimitInput,
} from '../../../src/domain/order';

const DAY = 86_400;
const NOW = 1_790_000_000;

const dcaRules = { intervals: [3600, DAY], slotSteps: { 3600: 60, [DAY]: 3600 }, minAmountPerExecution: '1000', maxExecutionCount: 100, executionFeeBps: 15, tradable: true };
const limitRules = { minMakingAmount: '100', maxSlippageBps: 1000, minDuration: 300, maxDuration: 31 * DAY, executionFeeBps: 15, tradable: true };

describe('DCA scheduling', () => {
  it('picks the first slot at or after now', () => {
    // 10:20:00 UTC with hourly steps on a daily interval -> 11:00.
    const now = 1_790_000_000 - (1_790_000_000 % DAY) + 10 * 3600 + 20 * 60;

    expect(nextSlotOffset(DAY, 3600, now)).toBe(11 * 3600);
    expect(firstRoundAt(DAY, 11 * 3600, now)).toBe(now + 40 * 60);
    // Past the last slot of the interval it wraps to the next one.
    expect(nextSlotOffset(DAY, 3600, now - (now % DAY) + 23 * 3600 + 1)).toBe(0);
    expect(nextSlotOffset(3600, 60, now - (now % 3600))).toBe(0);
  });

  it('validates against the realm rules', () => {
    const order = { inputToken: 'a.A', outputToken: 'b.B', interval: DAY, amountPerExecution: '5000', executionCount: 10 };

    expect(validateDcaInput(order, dcaRules)).toEqual([]);
    expect(dcaTotal(order)).toBe('50000');
    expect(validateDcaInput({ ...order, amountPerExecution: '999' }, dcaRules)).toEqual(['belowMinimum']);
    expect(validateDcaInput({ ...order, executionCount: 101 }, dcaRules)).toEqual(['count']);
    expect(validateDcaInput({ ...order, interval: 60 }, dcaRules)).toEqual(['interval']);
    expect(validateDcaInput(order, { ...dcaRules, tradable: false })).toEqual(['pair']);
    expect(validateDcaInput({ ...order, amountPerExecution: '9223372036854775807', executionCount: 2 }, dcaRules)).toEqual(['tooLarge']);
  });
});

describe('limit orders', () => {
  it('converts a display price into the raw target', () => {
    // Sell 100 GNS (6 decimals) at 0.25 GNOT (6 decimals) -> 25 GNOT.
    expect(takingFromPrice('100000000', '0.25', 6, 6)).toBe('25000000');
    // Different decimals: 1 token with 18 decimals at 2 units of a 6-decimal token.
    expect(takingFromPrice('1000000000000000000', '2', 18, 6)).toBe('2000000');
    expect(takingFromPrice('1', '0.1', 6, 6)).toBe('0');
    expect(priceOf('100000000', '25000000', 6, 6)).toBe('0.25');
    expect(priceOf('0', '1', 6, 6)).toBeUndefined();
  });

  it('rounds the slippage minimum up like the realm', () => {
    expect(limitMinimumOutput('25000000', 0)).toBe('25000000');
    expect(limitMinimumOutput('25000001', 50)).toBe('24875001');
  });

  it('validates against the realm rules', () => {
    const order = { inputToken: 'a.A', outputToken: 'b.B', makingAmount: '1000', takingAmount: '500', slippageBps: 50, expiresAt: NOW + DAY };

    expect(validateLimitInput(order, limitRules, NOW)).toEqual([]);
    expect(validateLimitInput({ ...order, makingAmount: '99' }, limitRules, NOW)).toEqual(['belowMinimum']);
    expect(validateLimitInput({ ...order, takingAmount: '0' }, limitRules, NOW)).toEqual(['taking']);
    expect(validateLimitInput({ ...order, slippageBps: 1001 }, limitRules, NOW)).toEqual(['slippage']);
    expect(validateLimitInput({ ...order, expiresAt: NOW + 60 }, limitRules, NOW)).toEqual(['expiry']);
    expect(validateLimitInput({ ...order, outputToken: 'a.A' }, limitRules, NOW)).toEqual(['pair']);
  });
});

describe('order state', () => {
  const dca = { kind: 'dca' as const, id: '7', inputToken: 'a.A', outputToken: 'b.B', interval: DAY, amountPerExecution: '50', executionCount: 10, executedCount: 3, nextExecutionAt: NOW + 60, claimable: '9', createdAt: NOW };
  const limit = { kind: 'limit' as const, id: '3', inputToken: 'a.A', outputToken: 'b.B', makingAmount: '100', takingAmount: '25', slippageBps: 0, filledInput: '40', grossOutput: '10', executionFee: '0', createdAt: NOW, expiresAt: NOW + DAY };

  it('reports progress and what a cancel returns', () => {
    expect(orderProgress(dca)).toBeCloseTo(0.3);
    expect(remainingInput(dca)).toBe('350');
    expect(orderProgress(limit)).toBeCloseTo(0.4);
    expect(remainingInput(limit)).toBe('60');
  });

  it('derives the status', () => {
    expect(orderStatus(dca, NOW)).toBe(OrderStatus.ACTIVE);
    expect(orderStatus({ ...dca, executedCount: 10 }, NOW)).toBe(OrderStatus.COMPLETED);
    expect(orderStatus(limit, NOW + DAY)).toBe(OrderStatus.EXPIRED);
  });
});
