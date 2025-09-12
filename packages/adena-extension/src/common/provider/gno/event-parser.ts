import { StorageDepositEvent, StorageUnlockEvent } from '@adena-wallet/sdk';
import { parseTokenAmount } from '@common/utils/amount-utils';
import { Any } from '@gnolang/gno-js-client';
import { StorageDepositEventType } from './types';
import { parseProto } from './utils';

export const parseStorageDeposits = (
  events: Any[],
): {
  storageDeposit: number;
  unlockDeposit: number;
  storageUsage: number;
  releaseStorageUsage: number;
} => {
  return events.reduce(
    (acc, event) => {
      const storageDeposit = parseStorageDeposit(event);
      acc.storageDeposit += storageDeposit.storageDeposit;
      acc.unlockDeposit += storageDeposit.unlockDeposit;
      acc.storageUsage += storageDeposit.storageUsage;
      acc.releaseStorageUsage += storageDeposit.releaseStorageUsage;

      return acc;
    },
    {
      storageDeposit: 0,
      unlockDeposit: 0,
      storageUsage: 0,
      releaseStorageUsage: 0,
    },
  );
};

const parseStorageDeposit = (
  event: Any,
): {
  storageDeposit: number;
  unlockDeposit: number;
  storageUsage: number;
  releaseStorageUsage: number;
} => {
  switch (event.type_url) {
    case StorageDepositEventType.StorageDeposit: {
      const decodedEvent = parseProto(event.value, StorageDepositEvent.decode);
      const bytesDelta = decodedEvent.bytes_delta.toInt();
      const feeDelta = decodedEvent.fee_delta ? parseTokenAmount(decodedEvent.fee_delta) : 0;

      return {
        storageDeposit: Math.abs(feeDelta),
        storageUsage: Math.abs(bytesDelta),
        unlockDeposit: 0,
        releaseStorageUsage: 0,
      };
    }
    case StorageDepositEventType.UnlockDeposit: {
      const decodedEvent = parseProto(event.value, StorageUnlockEvent.decode);
      const bytesDelta = decodedEvent.bytes_delta.toInt();
      const feeDelta = decodedEvent.fee_refund ? parseTokenAmount(decodedEvent.fee_refund) : 0;

      return {
        storageDeposit: 0,
        storageUsage: 0,
        unlockDeposit: Math.abs(bytesDelta),
        releaseStorageUsage: Math.abs(feeDelta),
      };
    }
    default:
      break;
  }

  return {
    storageDeposit: 0,
    unlockDeposit: 0,
    storageUsage: 0,
    releaseStorageUsage: 0,
  };
};
