import { toHex } from '@cosmjs/encoding';

import { nobleScryptKdf } from '../../../src/security/scrypt-kdf';

const encode = (text: string): Uint8Array => new TextEncoder().encode(text);

describe('nobleScryptKdf', () => {
  it('reproduces the RFC 7914 empty-input vector', async () => {
    const key = await nobleScryptKdf.derive(new Uint8Array(), new Uint8Array(), { N: 16, r: 1, p: 1, dkLen: 64 });

    expect(toHex(key)).toBe('77d6576238657b203b19ca42c18a0497f16b4844e3074ae8dfdffa3fede21442'
      + 'fcd0069ded0948f8326a753a0fc81f17e8d3e0fb2e0d3628cf35e20c38d18906');
  });

  it('honours dkLen and is deterministic', async () => {
    const params = { N: 2 ** 10, r: 8, p: 1, dkLen: 16 };
    const a = await nobleScryptKdf.derive(encode('pw'), encode('salt'), params);

    expect(a).toHaveLength(16);
    expect(toHex(await nobleScryptKdf.derive(encode('pw'), encode('salt'), params))).toBe(toHex(a));
    expect(toHex(await nobleScryptKdf.derive(encode('pw'), encode('pepper'), params))).not.toBe(toHex(a));
  });

  it('rejects an N that is not a power of two', async () => {
    await expect(nobleScryptKdf.derive(encode('pw'), encode('salt'), { N: 1000, r: 8, p: 1, dkLen: 32 })).rejects.toThrow();
  });
});
