// General (MMKV) storage keys. Values are JSON documents owned by one repository each.
export const StorageKey = {
  SCHEMA_VERSION: 'schema.version',
  ACCOUNTS: 'accounts',
  NETWORKS: 'networks',
  CONNECTED_APPS: 'connected-apps',
  PREFERENCES: 'preferences',
  TOKEN_LISTS: 'token-lists',
  ADDRESS_BOOK: 'address-book',
  NFT_PREFERENCES: 'nft-preferences',
  RESET_PENDING: 'reset.pending',
} as const;

export type StorageKey = (typeof StorageKey)[keyof typeof StorageKey];

// One raw data URI per account (`account-photo.<accountId>`), kept out of the accounts document
// so listing accounts never parses image data.
export const ACCOUNT_PHOTO_KEY_PREFIX = 'account-photo.';
