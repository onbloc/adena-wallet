import CryptoJS from 'crypto-js';

import { Argon2id, isArgon2idOptions } from '../crypto';
import { toAscii, toHex } from '../encoding';

interface KdfConfiguration {
  /**
   * An algorithm identifier, such as "argon2id" or "scrypt".
   */
  readonly algorithm: string;
  /** A map of algorithm-specific parameters */
  readonly params: Record<string, unknown>;
}

export async function executeKdf(
  salt: string,
  password: string,
  configuration: KdfConfiguration,
): Promise<Uint8Array> {
  switch (configuration.algorithm) {
    case 'argon2id': {
      const options = configuration.params;
      if (!isArgon2idOptions(options)) throw new Error('Invalid format of argon2id params');
      return Argon2id.execute(password, toAscii(salt), options);
    }
    default:
      throw new Error('Unsupported KDF algorithm');
  }
}

export const makeCryptKey = async (password: string) => {
  const SALT_KEY = process.env.SALT_KEY ?? '';
  const kdfConfiguration = {
    algorithm: 'argon2id',
    params: {
      outputLength: 32,
      opsLimit: 24,
      memLimitKib: 12 * 1024,
    },
  };
  const cryptKey = await executeKdf(SALT_KEY, password, kdfConfiguration);
  return toHex(cryptKey);
};

export const encryptSha256 = (password: string) => {
  return Promise.resolve(makeCryptKey(password)).then((cryptKey) =>
    CryptoJS.SHA256(cryptKey).toString(),
  );
};

export const encryptAES = (value: string, password: string) => {
  return Promise.resolve(makeCryptKey(password)).then((cryptKey) =>
    CryptoJS.AES.encrypt(value, cryptKey).toString(),
  );
};

export const decryptAES = (encryptedValue: string, password: string) => {
  return Promise.resolve(makeCryptKey(password)).then((cryptKey) =>
    CryptoJS.AES.decrypt(encryptedValue, cryptKey).toString(CryptoJS.enc.Utf8),
  );
};
