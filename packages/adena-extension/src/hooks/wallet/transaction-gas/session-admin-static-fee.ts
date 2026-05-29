import {
  Document,
  MSG_CREATE_SESSION_ENDPOINT,
  MSG_REVOKE_ALL_SESSIONS_ENDPOINT,
  MSG_REVOKE_SESSION_ENDPOINT,
} from 'adena-module';
import BigNumber from 'bignumber.js';
import { GasInfo, NetworkFeeSettingInfo, NetworkFeeSettingType } from '@types';

const STATIC_STORAGE_DEPOSITS = {
  storageDeposit: 0,
  unlockDeposit: 0,
  storageUsage: 0,
  releaseStorageUsage: 0,
};

const SESSION_ADMIN_MESSAGE_TYPES = new Set<string>([
  MSG_CREATE_SESSION_ENDPOINT,
  MSG_REVOKE_SESSION_ENDPOINT,
  MSG_REVOKE_ALL_SESSIONS_ENDPOINT,
]);

const getMessageType = (message: unknown): string | undefined => {
  if (typeof message !== 'object' || message === null) {
    return undefined;
  }

  const record = message as {
    type?: unknown;
    '@type'?: unknown;
    type_url?: unknown;
    typeUrl?: unknown;
  };
  const type = record.type ?? record['@type'] ?? record.type_url ?? record.typeUrl;
  return typeof type === 'string' ? type : undefined;
};

export const isStaticSessionAdminFeeDocument = (
  document?: Document | null,
): boolean => {
  const messages = document?.msgs ?? [];
  return messages.length > 0 && messages.every((message) =>
    SESSION_ADMIN_MESSAGE_TYPES.has(getMessageType(message) ?? ''),
  );
};

export const makeStaticSessionAdminGasInfo = (
  document?: Document | null,
): GasInfo | null => {
  if (!isStaticSessionAdminFeeDocument(document)) {
    return null;
  }

  const gasWanted = BigNumber(document?.fee.gas || 0).toNumber();
  const gasFee = BigNumber(document?.fee.amount?.[0]?.amount || 0).toNumber();

  return {
    gasFee,
    gasUsed: gasWanted,
    gasWanted,
    gasPrice: gasWanted > 0 ? BigNumber(gasFee).dividedBy(gasWanted).toNumber() : 0,
    hasError: false,
    simulateErrorMessage: null,
  };
};

export const makeStaticSessionAdminFeeSettings = (
  document?: Document | null,
): NetworkFeeSettingInfo[] | null => {
  const gasInfo = makeStaticSessionAdminGasInfo(document);
  if (!gasInfo) {
    return null;
  }

  return Object.values(NetworkFeeSettingType).map((settingType) => ({
    settingType,
    gasInfo,
    storageDeposits: STATIC_STORAGE_DEPOSITS,
  }));
};
