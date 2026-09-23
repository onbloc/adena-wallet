import { packagePathOfGrc721CollectionId, parseGrc721CollectionId } from './grc721-token-id';

describe('parseGrc721CollectionId', () => {
  it('splits a grc721 Token.ID into realm, symbol and sequence', () => {
    expect(parseGrc721CollectionId('gno.land/r/gnoswap/gnft.GNFT.0000000')).toEqual({
      packagePath: 'gno.land/r/gnoswap/gnft',
      symbol: 'GNFT',
      sequence: '0000000',
    });
  });

  it('keeps the dots of the domain out of the split', () => {
    expect(parseGrc721CollectionId('gno.land/r/demo/nft.ITEM.0000003')?.packagePath).toBe(
      'gno.land/r/demo/nft',
    );
  });

  it('accepts the symbol charset grc721 allows', () => {
    expect(parseGrc721CollectionId('gno.land/r/demo/nft.MY_NFT-1.0000001')).toEqual({
      packagePath: 'gno.land/r/demo/nft',
      symbol: 'MY_NFT-1',
      sequence: '0000001',
    });
  });

  it('rejects values that are not a full collection id', () => {
    // A bare realm path: no symbol, no sequence.
    expect(parseGrc721CollectionId('gno.land/r/gnoswap/gnft')).toBeNull();
    // Symbol but no sequence.
    expect(parseGrc721CollectionId('gno.land/r/gnoswap/gnft.GNFT')).toBeNull();
    expect(parseGrc721CollectionId('')).toBeNull();
    expect(parseGrc721CollectionId('gno.land/r/gnoswap/gnft.GNFT.')).toBeNull();
  });
});

describe('packagePathOfGrc721CollectionId', () => {
  it('returns the realm path, or null when the id does not parse', () => {
    expect(packagePathOfGrc721CollectionId('gno.land/r/gnoswap/gnft.GNFT.0000000')).toBe(
      'gno.land/r/gnoswap/gnft',
    );
    expect(packagePathOfGrc721CollectionId('gno.land/r/gnoswap/gnft')).toBeNull();
  });
});
