import { toHex } from '@cosmjs/encoding';

import { nobleScryptKdf, ScryptKdf } from '../src/security/scrypt-kdf';
import { ScryptXChaChaVaultCipher } from '../src/security/vault-cipher';

const SETTINGS = { N: 2 ** 10, r: 8, p: 1 };
const encode = (text: string): Uint8Array => new TextEncoder().encode(text);

// RFC 7914 §12 test vectors.
export const RFC7914_VECTORS = [
  {
    password: 'password',
    salt: 'NaCl',
    params: { N: 1024, r: 8, p: 16, dkLen: 64 },
    expected: 'fdbabe1c9d3472007856e7190d01e9fe7c6ad7cbc8237830e77376634b373162'
      + '2eaf30d92e22a3886ff109279d9830dac727afb94a83ee6d8360cbdfa2cc0640',
  },
  {
    password: 'pleaseletmein',
    salt: 'SodiumChloride',
    params: { N: 16384, r: 8, p: 1, dkLen: 64 },
    expected: '7023bdcb3afd7348461c06cd81fd38ebfda8fbba904f8e3ea9b543f6545da1f2'
      + 'd5432955613f0fcf62d49705242a9af9e61e85dc0d651e40dfcf017b45575887',
  },
];

describe('scrypt KDF seam', () => {
  it.each(RFC7914_VECTORS)('reproduces RFC 7914 ($password / $salt)', async ({ password, salt, params, expected }) => {
    expect(toHex(await nobleScryptKdf.derive(encode(password), encode(salt), params))).toBe(expected);
  });

  it('keeps vaults readable across KDF implementations with identical output', async () => {
    const calls: number[] = [];
    const recording: ScryptKdf = {
      derive: (password, salt, params) => {
        calls.push(params.N);
        return nobleScryptKdf.derive(password, salt, params);
      },
    };
    const encrypted = await new ScryptXChaChaVaultCipher(SETTINGS).encrypt('secret', 'password');

    expect(await new ScryptXChaChaVaultCipher(SETTINGS, recording).decrypt(encrypted, 'password')).toBe('secret');
    expect(calls).toEqual([SETTINGS.N]);
  });
});
