export const COMMAND_KEYS = {
  encryptPassword: 'ENCRYPT_PASSWORD',
  decryptPassword: 'DECRYPT_PASSWORD',
  clearEncryptKey: 'CLEAR_ENCRYPT_KEY',
} as const;
export type CommandKeyType = keyof typeof COMMAND_KEYS;
export type CommandValueType = (typeof COMMAND_KEYS)[keyof typeof COMMAND_KEYS];
