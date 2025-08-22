import { BinaryReader } from '@bufbuild/protobuf/wire';
import { parseTokenAmount } from '@common/utils/amount-utils';
import { ABCIResponse, Any, RPCRequest, RPCResponse } from '@gnolang/tm2-js-client';
import { GnoEvent } from 'adena-module';
import { StorageDepositAttributeKey, StorageDepositEventType } from './types';

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
  const decodedEvent = parseProto(event.value, GnoEvent.decode);
  const attributes = decodedEvent.attributes;

  switch (decodedEvent.type) {
    case StorageDepositEventType.StorageDeposit: {
      const depositAttribute = attributes.find(
        (attribute) => attribute.key === StorageDepositAttributeKey.Deposit,
      );
      const storageUsageAttribute = attributes.find(
        (attribute) => attribute.key === StorageDepositAttributeKey.Storage,
      );
      if (!depositAttribute || !storageUsageAttribute) {
        break;
      }

      const storageDeposit = parseTokenAmount(depositAttribute.value);
      const storageUsage = parseStorageUsage(storageUsageAttribute.value);

      return {
        storageDeposit,
        storageUsage,
        unlockDeposit: 0,
        releaseStorageUsage: 0,
      };
    }
    case StorageDepositEventType.UnlockDeposit: {
      const unlockDepositAttribute = attributes.find(
        (attribute) => attribute.key === StorageDepositAttributeKey.Deposit,
      );
      const releaseStorageUsageAttribute = attributes.find(
        (attribute) => attribute.key === StorageDepositAttributeKey.ReleaseStorage,
      );
      if (!unlockDepositAttribute || !releaseStorageUsageAttribute) {
        break;
      }

      const unlockDeposit = parseTokenAmount(unlockDepositAttribute.value);
      const releaseStorageUsage = parseStorageUsage(releaseStorageUsageAttribute.value);

      return {
        storageDeposit: 0,
        storageUsage: 0,
        unlockDeposit,
        releaseStorageUsage,
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

const parseStorageUsage = (usage: string): number => {
  const splits = usage.split(' ');
  if (splits.length !== 2) {
    return 0;
  }

  return parseInt(splits[0], 10);
};
