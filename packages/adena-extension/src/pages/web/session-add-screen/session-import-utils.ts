export const MASTER_ADDRESS_LENGTH = 40;
export const MASTER_ADDRESS_FORMAT_ERROR = 'Invalid address format';
export const NO_SESSION_FOUND_ERROR = 'No session found';

export const sanitizeMasterAddressInput = (value: string): string =>
  value.replace(/[^a-zA-Z0-9]/g, '').slice(0, MASTER_ADDRESS_LENGTH);

export const sanitizeSessionPrivateKeyInput = (value: string): string =>
  value.replace(/[^a-zA-Z0-9]/g, '');
