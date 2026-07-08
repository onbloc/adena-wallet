import {
  MSG_CREATE_SESSION_ENDPOINT,
  MSG_REVOKE_ALL_SESSIONS_ENDPOINT,
  MSG_REVOKE_SESSION_ENDPOINT,
} from 'adena-module';

export const validateDoContractRequest = (requestData: any): boolean => {
  if (!Array.isArray(requestData?.messages)) {
    return false;
  }
  return true;
};

export const validateTransactionMessageOfBankSend = (
  message: {
    [key in string]: any;
  },
): boolean => {
  if (!message.type || !message.value) {
    return false;
  }
  if (message.type !== '/bank.MsgSend') {
    return false;
  }
  if (typeof message.value !== 'object') {
    return false;
  }
  if (!message.value.to_address || typeof message.value.to_address !== 'string') {
    return false;
  }
  if (!message.value.from_address || typeof message.value.from_address !== 'string') {
    return false;
  }
  if (!message.value.amount || typeof message.value.amount !== 'string') {
    return false;
  }

  return true;
};

export const validateTransactionMessageOfVmCall = (message: { [key in string]: any }): boolean => {
  if (!message.type || !message.value) {
    return false;
  }
  if (message.type !== '/vm.m_call') {
    return false;
  }
  if (typeof message.value !== 'object') {
    return false;
  }
  if (Object.keys(message.value).indexOf('caller') === -1) {
    return false;
  }
  if (Object.keys(message.value).indexOf('send') === -1) {
    return false;
  }
  if (Object.keys(message.value).indexOf('pkg_path') === -1) {
    return false;
  }
  if (Object.keys(message.value).indexOf('func') === -1) {
    return false;
  }
  if (Object.keys(message.value).indexOf('args') === -1) {
    return false;
  }

  return true;
};

export const validateTransactionMessageOfAddPkg = (message: { [key in string]: any }): boolean => {
  if (!message.type || !message.value) {
    return false;
  }
  if (message.type !== '/vm.m_addpkg') {
    return false;
  }
  if (typeof message.value !== 'object') {
    return false;
  }
  if (typeof message.value.creator !== 'string') {
    return false;
  }
  if (typeof message.value.package !== 'object') {
    return false;
  }

  const packageValue = message.value.package;
  if (typeof packageValue?.Name !== 'string' && typeof packageValue?.name !== 'string') {
    return false;
  }
  if (typeof packageValue?.Path !== 'string' && typeof packageValue?.path !== 'string') {
    return false;
  }
  if (!Array.isArray(packageValue?.Files) && !Array.isArray(packageValue?.files)) {
    return false;
  }
  return true;
};

export const validateTransactionMessageOfRun = (message: { [key in string]: any }): boolean => {
  if (!message.type || !message.value) {
    return false;
  }
  if (message.type !== '/vm.m_run') {
    return false;
  }
  if (typeof message.value !== 'object') {
    return false;
  }
  if (typeof message.value.caller !== 'string') {
    return false;
  }
  if (typeof message.value.send !== 'string') {
    return false;
  }
  if (typeof message.value.package !== 'object') {
    return false;
  }

  const packageValue = message.value.package;
  if (typeof packageValue?.Name !== 'string' && typeof packageValue?.name !== 'string') {
    return false;
  }
  if (typeof packageValue?.Path !== 'string' && typeof packageValue?.path !== 'string') {
    return false;
  }
  if (!Array.isArray(packageValue?.Files) && !Array.isArray(packageValue?.files)) {
    return false;
  }
  return true;
};

export const validateTransactionMessageOfCreateSession = (
  message: {
    [key in string]: any;
  },
): boolean => {
  if (!isMessageWithValue(message, MSG_CREATE_SESSION_ENDPOINT)) {
    return false;
  }

  const value = message.value;
  if (typeof value.creator !== 'string' || value.creator === '') {
    return false;
  }
  if (!isRecord(value.session_key)) {
    return false;
  }
  if (typeof value.session_key.type_url !== 'string' || value.session_key.type_url === '') {
    return false;
  }
  if (!hasValue(value.session_key, 'value')) {
    return false;
  }
  if (!Array.isArray(value.allow_paths) || !value.allow_paths.every(isNonEmptyString)) {
    return false;
  }
  if (hasValue(value, 'spend_limit') && typeof value.spend_limit !== 'string') {
    return false;
  }

  return true;
};

export const validateTransactionMessageOfRevokeSession = (
  message: {
    [key in string]: any;
  },
): boolean => {
  if (!isMessageWithValue(message, MSG_REVOKE_SESSION_ENDPOINT)) {
    return false;
  }

  const value = message.value;
  if (typeof value.creator !== 'string' || value.creator === '') {
    return false;
  }
  if (!isRecord(value.session_key)) {
    return false;
  }
  if (typeof value.session_key.type_url !== 'string' || value.session_key.type_url === '') {
    return false;
  }
  if (!hasValue(value.session_key, 'value')) {
    return false;
  }

  return true;
};

export const validateTransactionMessageOfRevokeAllSessions = (
  message: {
    [key in string]: any;
  },
): boolean => {
  if (!isMessageWithValue(message, MSG_REVOKE_ALL_SESSIONS_ENDPOINT)) {
    return false;
  }

  return typeof message.value.creator === 'string' && message.value.creator !== '';
};

const isMessageWithValue = (message: { [key in string]: any }, type: string): boolean => {
  if (!message.type || !message.value) {
    return false;
  }
  if (message.type !== type) {
    return false;
  }
  return isRecord(message.value);
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const hasValue = (value: Record<string, unknown>, key: string): boolean => {
  return Object.prototype.hasOwnProperty.call(value, key) && value[key] !== undefined;
};

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === 'string' && value !== '';
};
