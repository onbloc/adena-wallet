// The SDK cannot load under jsdom; its decoders only need to hand back the
// event fields, so the events below are carried as JSON.
jest.mock('@adena-wallet/sdk', () => {
  const decode = (input: Uint8Array): unknown => JSON.parse(Buffer.from(input).toString());
  return {
    StorageDepositEvent: { decode },
    StorageUnlockEvent: { decode },
  };
});

import { parseStorageDeposits } from './event-parser';
import { StorageDepositEventType } from './types';

const encode = (event: object): Uint8Array => Uint8Array.from(Buffer.from(JSON.stringify(event)));

// Amounts from a gno.land realm creating, then deleting, an object: storage
// costs 100ugnot per byte.
const depositEvent = {
  type_url: StorageDepositEventType.StorageDeposit,
  value: encode({
    bytes_delta: '16514',
    fee_delta: '1651400ugnot',
    pkg_path: 'gno.land/r/demo/realm',
  }),
};

const unlockEvent = {
  type_url: StorageDepositEventType.UnlockDeposit,
  value: encode({
    bytes_delta: '-16464',
    fee_refund: '1646400ugnot',
    pkg_path: 'gno.land/r/demo/realm',
    refund_withheld: false,
  }),
};

describe('parseStorageDeposits', () => {
  it('reads the locked fee and bytes of a StorageDepositEvent', () => {
    expect(parseStorageDeposits([depositEvent])).toEqual({
      storageDeposit: 1651400,
      storageUsage: 16514,
      unlockDeposit: 0,
      releaseStorageUsage: 0,
    });
  });

  it('reads the refunded fee and released bytes of a StorageUnlockEvent', () => {
    expect(parseStorageDeposits([unlockEvent])).toEqual({
      storageDeposit: 0,
      storageUsage: 0,
      unlockDeposit: 1646400,
      releaseStorageUsage: 16464,
    });
  });

  it('sums the events of a transaction', () => {
    expect(parseStorageDeposits([depositEvent, unlockEvent])).toEqual({
      storageDeposit: 1651400,
      storageUsage: 16514,
      unlockDeposit: 1646400,
      releaseStorageUsage: 16464,
    });
  });
});
