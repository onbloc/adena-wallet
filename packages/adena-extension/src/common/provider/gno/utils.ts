import { StorageDepositEvent, StorageUnlockEvent } from '@adena-wallet/sdk';
import { BinaryReader } from '@bufbuild/protobuf/wire';
import { parseTokenAmount } from '@common/utils/amount-utils';
import { ABCIResponse, Any, RPCRequest, RPCResponse } from '@gnolang/tm2-js-client';
import { StorageDepositEventType } from './types';

const HTTP_PROTOCOL = 'http';
const HTTPS_PROTOCOL = 'https';
const HTTP_PROTOCOL_PREFIX = `${HTTP_PROTOCOL}://`;
const HTTPS_PROTOCOL_PREFIX = `${HTTPS_PROTOCOL}://`;

export const parseProto = <T>(
  data: string | Uint8Array,
  decodeFn: (input: BinaryReader | Uint8Array, length?: number) => T,
): T => {
  const buffer = typeof data === 'string' ? Buffer.from(data, 'base64') : data;
  const protoData = decodeFn(buffer);

  return protoData;
};

export const fetchABCIResponse = async (
  url: string,
  withCache?: boolean,
): Promise<RPCResponse<ABCIResponse>> => {
  const response = await fetch(url, {
    cache: withCache ? 'force-cache' : 'default',
  });
  const data = await response.json();
  return data;
};

export const postABCIResponse = async (
  url: string,
  body: RPCRequest,
): Promise<RPCResponse<ABCIResponse>> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  return data;
};

export const makeRequestQueryPath = (
  baseUrl: string,
  path: string,
  data: string,
  ssl: boolean,
): string => {
  const requestUri = `${baseUrl}/abci_query?path="${path}"&data="${data}"`;

  if (hasHttpProtocol(baseUrl)) {
    return requestUri;
  }

  const protocol = ssl ? HTTPS_PROTOCOL : HTTP_PROTOCOL;

  return `${protocol}://${requestUri}`;
};

export const isHttpsAvailable = async (domain: string): Promise<boolean> => {
  if (hasHttpProtocol(domain)) {
    return isHttpsProtocol(domain);
  }

  try {
    const response = await fetch(`${HTTPS_PROTOCOL_PREFIX}${domain}`, {
      method: 'HEAD',
      cache: 'force-cache',
    });
    return response.ok;
  } catch {
    return false;
  }
};

export const hasHttpProtocol = (domain: string): boolean => {
  return isHttpProtocol(domain) || isHttpsProtocol(domain);
};

export const isHttpsProtocol = (domain: string): boolean => {
  return domain.startsWith(HTTPS_PROTOCOL_PREFIX);
};

export const isHttpProtocol = (domain: string): boolean => {
  return domain.startsWith(HTTP_PROTOCOL_PREFIX);
};

export const isInterRealmParameter = (name: string, type: string): boolean => {
  return type === 'realm';
};

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
