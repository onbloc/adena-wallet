// General (MMKV) storage keys. Values are JSON documents owned by one repository each.
export const StorageKey = {
  SCHEMA_VERSION: 'schema.version',
  ACCOUNTS: 'accounts',
  NETWORKS: 'networks',
  CONNECTED_APPS: 'connected-apps',
  PROCESSED_DAPP_REQUESTS: 'processed-dapp-requests',
  PREFERENCES: 'preferences',
  TOKEN_LISTS: 'token-lists',
  ADDRESS_BOOK: 'address-book',
  NFT_PREFERENCES: 'nft-preferences',
  PENDING_BROADCASTS: 'pending-broadcasts',
  RESET_PENDING: 'reset.pending',
  RESTORE_PENDING: 'restore.pending',
  CLOUD_BACKUP: 'cloud-backup',
  CLOUD_BACKUP_PENDING_WRITE: 'cloud-backup.pending-write',
  NOTIFICATIONS: 'notifications',
} as const;

export type StorageKey = (typeof StorageKey)[keyof typeof StorageKey];

// One raw data URI per account (`account-photo.<accountId>`), kept out of the accounts document
// so listing accounts never parses image data.
export const ACCOUNT_PHOTO_KEY_PREFIX = 'account-photo.';
