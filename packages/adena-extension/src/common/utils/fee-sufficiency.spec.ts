import { checkFeeSufficiency, sumSpentGnotAmount } from './fee-sufficiency';

describe('sumSpentGnotAmount', () => {
  it('counts bank send `amount` and vm `send`', () => {
    const total = sumSpentGnotAmount([
      { value: { amount: '1000000ugnot' } },
      { value: { send: '2000000ugnot' } },
    ]);

    expect(total.toNumber()).toBe(3000000);
  });

  it('ignores max_deposit and empty send', () => {
    const total = sumSpentGnotAmount([{ value: { send: '', max_deposit: '5000000ugnot' } }]);

    expect(total.toNumber()).toBe(0);
  });

  it('only counts ugnot in multi-denom coins', () => {
    const total = sumSpentGnotAmount([{ value: { send: '7foo,1000000ugnot' } }]);

    expect(total.toNumber()).toBe(1000000);
  });

  it('returns 0 without messages', () => {
    expect(sumSpentGnotAmount(undefined).toNumber()).toBe(0);
  });
});

describe('checkFeeSufficiency', () => {
  it('flags the storage deposit when it exceeds what is left after send and fee', () => {
    // 3 GNOT balance, 1 GNOT swapped, 2.2 GNOT storage, 0.12 GNOT fee
    const result = checkFeeSufficiency({
      balance: 3000000,
      spentAmount: 1000000,
      networkFee: 120000,
      storageDeposit: 2200000,
      unlockDeposit: 0,
    });

    expect(result).toEqual({ isInsufficientNetworkFee: false, isInsufficientStorageDeposit: true });
  });

  it('flags the storage deposit when only the combined total exceeds the balance', () => {
    const result = checkFeeSufficiency({
      balance: 2000000,
      spentAmount: 0,
      networkFee: 120000,
      storageDeposit: 1900000,
      unlockDeposit: 0,
    });

    expect(result).toEqual({ isInsufficientNetworkFee: false, isInsufficientStorageDeposit: true });
  });

  it('flags the network fee when the balance cannot cover send and fee', () => {
    const result = checkFeeSufficiency({
      balance: 1000000,
      spentAmount: 1000000,
      networkFee: 120000,
      storageDeposit: 2200000,
      unlockDeposit: 0,
    });

    expect(result).toEqual({ isInsufficientNetworkFee: true, isInsufficientStorageDeposit: false });
  });

  it('passes when the balance covers everything', () => {
    const result = checkFeeSufficiency({
      balance: 3320000,
      spentAmount: 1000000,
      networkFee: 120000,
      storageDeposit: 2200000,
      unlockDeposit: 0,
    });

    expect(result).toEqual({
      isInsufficientNetworkFee: false,
      isInsufficientStorageDeposit: false,
    });
  });

  it('nets released storage against the deposit and never treats a refund as a credit', () => {
    const netted = checkFeeSufficiency({
      balance: 1120000,
      spentAmount: 0,
      networkFee: 120000,
      storageDeposit: 3000000,
      unlockDeposit: 2000000,
    });
    expect(netted.isInsufficientStorageDeposit).toBe(false);

    const refund = checkFeeSufficiency({
      balance: 100000,
      spentAmount: 0,
      networkFee: 120000,
      storageDeposit: 0,
      unlockDeposit: 5000000,
    });
    expect(refund.isInsufficientNetworkFee).toBe(true);
  });
});
