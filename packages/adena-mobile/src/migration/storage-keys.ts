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
