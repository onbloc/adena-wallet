import sodium from 'libsodium-wrappers-sumo';

import { fromBase64UrlNoPadding, toBase64UrlNoPadding } from './base64';

describe('base64url without padding', () => {
  beforeAll(async () => {
    await sodium.ready;
  });

  it('matches libsodium to_base64 / from_base64 for every length up to 64', () => {
    for (let length = 0; length <= 64; length++) {
      const bytes = sodium.randombytes_buf(length);
      const encoded = toBase64UrlNoPadding(bytes);

      expect(encoded).toBe(sodium.to_base64(bytes));
      expect(fromBase64UrlNoPadding(encoded)).toEqual(sodium.from_base64(encoded));
    }
  });

  it('rejects standard or padded base64 like libsodium', () => {
    expect(() => fromBase64UrlNoPadding('+/8AAQI=')).toThrow();
    expect(() => fromBase64UrlNoPadding('-_8AAQI=')).toThrow();
    expect(() => fromBase64UrlNoPadding('A')).toThrow();
  });
});
