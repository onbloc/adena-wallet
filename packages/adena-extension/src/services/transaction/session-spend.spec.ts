import {
  addCoins,
  coinsToString,
  effectiveSpendUsed,
  estimateSessionSpend,
  isAllGTE,
  parseCoins,
} from './session-spend';

describe('parseCoins / coinsToString', () => {
  it('empty string is empty coins', () => {
    expect(parseCoins('')).toEqual([]);
    expect(coinsToString([])).toBe('');
  });

  it('single coin', () => {
    const coins = parseCoins('100ugnot');
    expect(coins).toEqual([{ amount: BigInt(100), denom: 'ugnot' }]);
    expect(coinsToString(coins)).toBe('100ugnot');
  });

  it('multiple coins are sorted by denom', () => {
    const coins = parseCoins('100ugnot,5uatom');
    expect(coins.map((c) => c.denom)).toEqual(['uatom', 'ugnot']);
  });

  it('rejects non-positive amount via merge', () => {
    expect(() => parseCoins('100UGNOT')).toThrow();
    expect(() => parseCoins('-5ugnot')).toThrow();
  });
});

describe('addCoins / isAllGTE', () => {
  it('addCoins merges same denom', () => {
    const sum = addCoins(parseCoins('100ugnot'), parseCoins('50ugnot'));
    expect(sum).toEqual([{ amount: BigInt(150), denom: 'ugnot' }]);
  });

  it('isAllGTE passes when limit covers used', () => {
    expect(isAllGTE(parseCoins('100ugnot'), parseCoins('50ugnot'))).toBe(true);
    expect(isAllGTE(parseCoins('100ugnot'), parseCoins('150ugnot'))).toBe(false);
  });

  it('missing denom on left counts as 0', () => {
    expect(isAllGTE(parseCoins('100ugnot'), parseCoins('1uatom'))).toBe(false);
  });
});

describe('estimateSessionSpend', () => {
  const masterAddr = 'g1master';
  const fee = { amount: '10', denom: 'ugnot' };

  it('fee alone is summed', () => {
    const result = estimateSessionSpend([], fee, masterAddr);
    expect(coinsToString(result)).toBe('10ugnot');
  });

  it('MsgSend from signer adds amount', () => {
    const msg = {
      type: '/bank.MsgSend',
      value: { from_address: masterAddr, amount: '100ugnot' },
    };
    const result = estimateSessionSpend([msg], fee, masterAddr);
    expect(coinsToString(result)).toBe('110ugnot');
  });

  it('MsgSend from other signer is ignored', () => {
    const msg = {
      type: '/bank.MsgSend',
      value: { from_address: 'g1other', amount: '100ugnot' },
    };
    const result = estimateSessionSpend([msg], fee, masterAddr);
    expect(coinsToString(result)).toBe('10ugnot');
  });

  it('MsgCall.send contributes outflow', () => {
    const msg = {
      type: '/vm.m_call',
      value: { send: '50ugnot' },
    };
    const result = estimateSessionSpend([msg], fee, masterAddr);
    expect(coinsToString(result)).toBe('60ugnot');
  });

  it('ignores unsupported message types (e.g. MsgMultiSend has no proto encoder)', () => {
    const msg = {
      type: '/bank.MsgMultiSend',
      value: {},
    };
    // Fee still counts; the unsupported message contributes nothing.
    const result = estimateSessionSpend([msg], fee, masterAddr);
    expect(coinsToString(result)).toBe('10ugnot');
  });
});

describe('effectiveSpendUsed', () => {
  it('treats stored spendUsed as-is when reset boundary not crossed', () => {
    const now = 1_000_000;
    // spendReset(999_950) + spendPeriod(100) = 1_000_050; now < boundary
    const used = effectiveSpendUsed('100ugnot', 999_950, 100, now);
    expect(coinsToString(used)).toBe('100ugnot');
  });

  it('treats spendUsed as zero once reset boundary crossed', () => {
    const now = 1_000_000;
    // spendReset(900_000) + spendPeriod(100) = 900_100; now >= boundary
    const used = effectiveSpendUsed('100ugnot', 900_000, 100, now);
    expect(used).toEqual([]);
  });

  it('handles undefined spendUsed', () => {
    expect(effectiveSpendUsed(undefined, undefined, 0, 0)).toEqual([]);
  });
});
