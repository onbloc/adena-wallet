import { isBase64Hash, isHexHash, toHexHash } from './hash-utils';

const BASE64_HASH = 'mMWS0kikDwRwErB1vVYPQ5zj7ZKVzb6mLIc+ILvQvQs=';
const HEX_HASH = '98c592d248a40f047012b075bd560f439ce3ed9295cdbea62c873e20bbd0bd0b';

describe('hash-utils', () => {
  describe('toHexHash', () => {
    it('converts a base64 tx hash to lowercase hex', () => {
      expect(toHexHash(BASE64_HASH)).toBe(HEX_HASH);
    });

    it('keeps an already hex-encoded hash unchanged', () => {
      expect(toHexHash(HEX_HASH)).toBe(HEX_HASH);
    });

    it('lowercases an uppercase hex hash', () => {
      expect(toHexHash(HEX_HASH.toUpperCase())).toBe(HEX_HASH);
    });

    it('strips a 0x prefix', () => {
      expect(toHexHash(`0x${HEX_HASH}`)).toBe(HEX_HASH);
    });

    it('passes through values that are not 32-byte hashes', () => {
      expect(toHexHash('')).toBe('');
      expect(toHexHash('not-a-hash')).toBe('not-a-hash');
      expect(toHexHash('deadbeef')).toBe('deadbeef');
    });
  });

  describe('isHexHash / isBase64Hash', () => {
    it('recognizes both encodings', () => {
      expect(isHexHash(HEX_HASH)).toBe(true);
      expect(isHexHash(`0x${HEX_HASH}`)).toBe(true);
      expect(isHexHash(BASE64_HASH)).toBe(false);

      expect(isBase64Hash(BASE64_HASH)).toBe(true);
      expect(isBase64Hash(HEX_HASH)).toBe(false);
    });
  });
});
