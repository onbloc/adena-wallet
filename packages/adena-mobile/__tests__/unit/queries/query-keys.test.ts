import { NO_ID_KEY, queryKeys } from '../../../src/queries/query-keys';

describe('queryKeys', () => {
  it('prefixes every key with the app root', () => {
    expect(NO_ID_KEY).toBe('none');
    expect(queryKeys.all).toEqual(['adena']);
    expect(queryKeys.boot()).toEqual(['adena', 'boot']);
    expect(queryKeys.sessionBootstrap()).toEqual(['adena', 'session-bootstrap']);
    expect(queryKeys.walletStatus()).toEqual(['adena', 'wallet-status']);
    expect(queryKeys.biometric()).toEqual(['adena', 'biometric']);
  });

  it('nests balance keys under balances', () => {
    expect(queryKeys.balances()).toEqual(['adena', 'balance']);
    expect(queryKeys.nativeBalance('n', 'a')).toEqual(['adena', 'balance', 'native', 'n', 'a']);
    expect(queryKeys.tokenBalances('n', 'a', ['x', 'y'])).toEqual(['adena', 'balance', 'tokens', 'n', 'a', 'x,y']);
    expect(queryKeys.tokenBalances('n', 'a', [])).toEqual(['adena', 'balance', 'tokens', 'n', 'a', '']);
  });

  it('builds token, price, nft, market and activity keys', () => {
    expect(queryKeys.tokenList('n', 'a')).toEqual(['adena', 'token-list', 'n', 'a']);
    expect(queryKeys.tokenSearch('n')).toEqual(['adena', 'token-search', 'n']);
    expect(queryKeys.tokenLookup('n', 't')).toEqual(['adena', 'token-lookup', 'n', 't']);
    expect(queryKeys.prices('n', ['a', 'b'])).toEqual(['adena', 'prices', 'n', 'a,b']);
    expect(queryKeys.nftCollections('n', 'a')).toEqual(['adena', 'nft-collections', 'n', 'a']);
    expect(queryKeys.nftItems('n', 'a', 'c')).toEqual(['adena', 'nft-items', 'n', 'a', 'c']);
    expect(queryKeys.nftUri('n', 'p', '1')).toEqual(['adena', 'nft-uri', 'n', 'p', '1']);
    expect(queryKeys.nftMetadata('n', 'p', '1')).toEqual(['adena', 'nft-metadata', 'n', 'p', '1']);
    expect(queryKeys.marketData('n', 't', '1D')).toEqual(['adena', 'market', 'n', 't', '1D']);
    expect(queryKeys.activities('n', 'a', 'all')).toEqual(['adena', 'activities', 'n', 'a', 'all']);
  });
});
