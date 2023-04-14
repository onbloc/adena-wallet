import {
  decryptAES,
  encryptAES,
  encryptSha256,
  executeKdf,
  makeCryptKey,
} from './wallet-crypto-util';
import { toHex } from '../encoding';

describe('execute kdf', () => {
  it('success', async () => {
    const salt = 'TESTTESTTESTTEST';
    const password = 'PASSWORD';
    const kdfConfiguration = {
      algorithm: 'argon2id',
      params: {
        outputLength: 32,
        opsLimit: 24,
        memLimitKib: 12 * 1024,
      },
    };
    const result = await executeKdf(salt, password, kdfConfiguration);
    const hexResult = toHex(result);

    expect(hexResult).toBe('71bb8136991859f3f9dc6c4906d75bad4815e73dc5a4db3424e56db7af409889');
  });
});

describe('make cryptkey with kdf', () => {
  it('success', async () => {
    const password = 'PASSWORD';
    const result = await makeCryptKey(password);

    expect(result).toBe('71bb8136991859f3f9dc6c4906d75bad4815e73dc5a4db3424e56db7af409889');
  });
});

describe('encrypt SHA256', () => {
  it('success', async () => {
    const password = 'PASSWORD';
    const result = await encryptSha256(password);

    expect(result).toBe('111f4bbb4167459cd723d3aa07b3f12bf61a60ecf43f981975a6a0de6227fe76');
  });
});

describe('encrypt/decrypt AES', () => {
  it('encrypt success', async () => {
    const value = 'CURRENT_VALUE';
    const password = 'PASSWORD';
    const result = await encryptAES(value, password);

    expect(result).toBeTruthy();
  });

  it('decrypt success', async () => {
    const encryptedValue = 'U2FsdGVkX19RDg/GNciz8vKJlCdfp8oz3k0VJ0ypSgA=';
    const password = 'PASSWORD';
    const result = await decryptAES(encryptedValue, password);

    expect(result).toBe('CURRENT_VALUE');
  });

  it('encrypt with decrypt success', async () => {
    const value = 'CURRENT_VALUE';
    const password = 'PASSWORD';
    const encryptedValue = await encryptAES(value, password);
    const result = await decryptAES(encryptedValue, password);

    expect(result).toBe('CURRENT_VALUE');
  });
});
