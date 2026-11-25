// Key segment used while an id (account, token, collection) is not available yet.
export const NO_ID_KEY = 'none';

export const queryKeys = {
  all: ['adena'] as const,
  boot: () => [...queryKeys.all, 'boot'] as const,
  sessionBootstrap: () => [...queryKeys.all, 'session-bootstrap'] as const,
  walletStatus: () => [...queryKeys.all, 'wallet-status'] as const,
  biometric: () => [...queryKeys.all, 'biometric'] as const,
  balances: () => [...queryKeys.all, 'balance'] as const,
  nativeBalance: (networkId: string, accountId: string) => [...queryKeys.balances(), 'native', networkId, accountId] as const,
  tokenBalances: (networkId: string, accountId: string, tokenIds: string[]) =>
    [...queryKeys.balances(), 'tokens', networkId, accountId, tokenIds.join(',')] as const,
  tokenList: (networkId: string, accountId: string) => [...queryKeys.all, 'token-list', networkId, accountId] as const,
  tokenSearch: (networkId: string) => [...queryKeys.all, 'token-search', networkId] as const,
  tokenLookup: (networkId: string, tokenId: string) => [...queryKeys.all, 'token-lookup', networkId, tokenId] as const,
  prices: (networkId: string, tokenIds: string[]) => [...queryKeys.all, 'prices', networkId, tokenIds.join(',')] as const,
  nftCollections: (networkId: string, accountId: string) => [...queryKeys.all, 'nft-collections', networkId, accountId] as const,
  nftItems: (networkId: string, accountId: string, collectionId: string) =>
    [...queryKeys.all, 'nft-items', networkId, accountId, collectionId] as const,
  nftUris: (networkId: string) => [...queryKeys.all, 'nft-uri', networkId] as const,
  nftUri: (networkId: string, packagePath: string, nftId: string) => [...queryKeys.nftUris(networkId), packagePath, nftId] as const,
  nftMetadata: (networkId: string, packagePath: string, nftId: string) =>
    [...queryKeys.all, 'nft-metadata', networkId, packagePath, nftId] as const,
  marketData: (networkId: string, tokenId: string, range: string) => [...queryKeys.all, 'market', networkId, tokenId, range] as const,
  tokenInfo: (networkId: string, tokenId: string) => [...queryKeys.all, 'token-info', networkId, tokenId] as const,
  activities: (networkId: string, accountId: string, filterKey: string) =>
    [...queryKeys.all, 'activities', networkId, accountId, filterKey] as const,
};
