import BigNumber from 'bignumber.js';

import { getTransferLimitAmount } from './transfer-limit';

const limit = (params: {
  balance: string;
  sessionSpendable?: string | null;
  vestingLocked?: string | null;
  feeAmount?: string;
}): string =>
  getTransferLimitAmount({
    balance: BigNumber(params.balance),
    sessionSpendable: params.sessionSpendable == null ? null : BigNumber(params.sessionSpendable),
    vestingLocked: params.vestingLocked == null ? null : BigNumber(params.vestingLocked),
    feeAmount: BigNumber(params.feeAmount ?? '0'),
  }).toFixed();

describe('getTransferLimitAmount', () => {
  it('reserves the fee out of a plain balance', () => {
    expect(limit({ balance: '110', feeAmount: '0.01' })).toBe('109.99');
  });

  // The ante handler debits the fee without releasing any locked coins, so the
  // balance left over still has to cover the lock: 110 - 100 - 0.01.
  it('takes the fee off the unlocked amount, not the balance', () => {
    expect(limit({ balance: '110', vestingLocked: '100', feeAmount: '0.01' })).toBe('9.99');
  });

  it('matches the plain balance once the grant has fully vested', () => {
    expect(limit({ balance: '110', vestingLocked: '0', feeAmount: '0.01' })).toBe('109.99');
  });

  // Fees may dip into locked coins, so the balance can fall under the lock.
  it('allows nothing when the balance no longer covers its lock', () => {
    expect(limit({ balance: '100.005', vestingLocked: '100', feeAmount: '0.01' })).toBe('0');
    expect(limit({ balance: '90', vestingLocked: '100', feeAmount: '0.01' })).toBe('0');
  });

  it('keeps the session allowance when it binds before the balance', () => {
    expect(limit({ balance: '110', sessionSpendable: '20', feeAmount: '0.01' })).toBe('19.99');
  });

  it('takes whichever of the session allowance and the lock binds first', () => {
    // Lock binds: 110 - 100 = 10 is under the 20 allowance.
    expect(
      limit({ balance: '110', sessionSpendable: '20', vestingLocked: '100', feeAmount: '0.01' }),
    ).toBe('9.99');

    // Allowance binds: 110 - 50 = 60 is over the 20 allowance.
    expect(
      limit({ balance: '110', sessionSpendable: '20', vestingLocked: '50', feeAmount: '0.01' }),
    ).toBe('19.99');
  });

  it('keeps full precision on amounts a float would round', () => {
    expect(
      limit({ balance: '1304659.432987', vestingLocked: '1000000', feeAmount: '0.004800' }),
    ).toBe('304659.428187');
  });
});
