// Registry of every item kept in the platform keychain/keystore.
export const SecureKey = {
  // Password-encrypted mnemonic vault (primary copy).
  VAULT: 'vault',
  // Copy written before the primary, so a vault update never leaves zero complete copies.
  VAULT_STAGING: 'vault-staging',
  // Wallet password guarded by biometric access control.
  BIOMETRIC_PASSWORD: 'biometric-password',
  // Encryption key for the general MMKV storage.
  STORAGE_ENCRYPTION_KEY: 'storage-encryption-key',
  // Failed password attempts and back-off deadline, shared by every password prompt.
  PASSWORD_ATTEMPTS: 'password-attempts',
  // Failed cloud backup password attempts during restore; survives a factory reset.
  BACKUP_PASSWORD_ATTEMPTS: 'backup-password-attempts',
  // Schema version of secure items, used by secure migrations.
  SECURE_SCHEMA_VERSION: 'secure-schema-version',
} as const;

const SESSION_CARD_KEY_PREFIX = 'session-card-key.';

// One biometric-bound item per session card private key, named by the card's session address.
export type SessionCardSecureKey = `${typeof SESSION_CARD_KEY_PREFIX}${string}`;

export const sessionCardSecureKey = (sessionAddress: string): SessionCardSecureKey => `${SESSION_CARD_KEY_PREFIX}${sessionAddress}`;

export type SecureKey = (typeof SecureKey)[keyof typeof SecureKey] | SessionCardSecureKey;
