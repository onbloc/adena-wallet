import { toHex } from '@cosmjs/encoding';
import { HybridObject, NitroModules } from 'react-native-nitro-modules';

import { AppError, AppErrorCode } from '../core/errors';
import { ScryptKdf, ScryptParameters } from './scrypt-kdf';

// Mirrors react-native-quick-crypto's `Scrypt` Nitro spec (OpenSSL EVP_PBE_scrypt).
// Only this hybrid object is used, so the rest of the library (and its polyfills) stays unloaded.
interface NativeScrypt extends HybridObject<{ ios: 'c++'; android: 'c++' }> {
  deriveKey(
    password: ArrayBuffer,
    salt: ArrayBuffer,
    N: number,
    r: number,
    p: number,
    maxmem: number,
    keylen: number,
  ): Promise<ArrayBuffer>;
}

// OpenSSL needs 128 * r * (N + p + 2) bytes; the slack keeps its own accounting from failing.
const maxmemFor = ({ N, r, p }: ScryptParameters): number => 128 * r * (N + p + 2) + 1024 * 1024;

const copyToArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const buffer = new ArrayBuffer(bytes.byteLength);

  new Uint8Array(buffer).set(bytes);
  return buffer;
};

const loadNativeScrypt = (): NativeScrypt => {
  try {
    return NitroModules.createHybridObject<NativeScrypt>('Scrypt');
  }
  catch (error) {
    // Dev builds name the cause, usually a missing `pod install` or native rebuild.
    const detail = __DEV__ && error instanceof Error ? ` (${error.message})` : '';

    throw new AppError(AppErrorCode.CRYPTO_UNAVAILABLE, `Native cryptography is not available on this build.${detail}`, { cause: error });
  }
};

// RFC 7914 section 12, first vector: empty password and salt, N=16, r=1, p=1, 64 bytes.
const KNOWN_ANSWER_PARAMS: ScryptParameters = { N: 16, r: 1, p: 1, dkLen: 64 };
const KNOWN_ANSWER = '77d6576238657b203b19ca42c18a0497f16b4844e3074ae8dfdffa3fede21442fcd0069ded0948f8326a753a0fc81f17e8d3e0fb2e0d3628cf35e20c38d18906';

export interface NativeScryptKdf extends ScryptKdf {
  // Startup check: a missing module or a wrong derivation fails closed before any vault is touched.
  assertWorking(): Promise<void>;
}

export const createNativeScryptKdf = (): NativeScryptKdf => {
  let native: NativeScrypt | null = null;

  const kdf: NativeScryptKdf = {
    async assertWorking(): Promise<void> {
      const derived = await kdf.derive(new Uint8Array(), new Uint8Array(), KNOWN_ANSWER_PARAMS);

      if (toHex(derived) !== KNOWN_ANSWER) {
        throw new AppError(AppErrorCode.CRYPTO_UNAVAILABLE, 'Native cryptography returned an unexpected result on this build.');
      }
    },
    async derive(password, salt, params): Promise<Uint8Array<ArrayBuffer>> {
      native ??= loadNativeScrypt();
      const passwordBuffer = copyToArrayBuffer(password);

      try {
        const result = await native.deriveKey(
          passwordBuffer,
          copyToArrayBuffer(salt),
          params.N,
          params.r,
          params.p,
          maxmemFor(params),
          params.dkLen,
        );
        // The native buffer is wiped once copied; the caller owns (and wipes) the copy.
        const view = new Uint8Array(result);
        const key = view.slice();

        view.fill(0);
        return key;
      }
      finally {
        new Uint8Array(passwordBuffer).fill(0);
      }
    },
  };

  return kdf;
};
