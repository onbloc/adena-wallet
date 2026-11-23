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

// Output correctness and argument mapping are covered by __tests__/native-scrypt-kdf.test.ts;
// at startup only the presence of the native module is checked, so a broken build fails closed.
export const createNativeScryptKdf = (): ScryptKdf & { assertAvailable(): void } => {
  let native: NativeScrypt | null = null;

  return {
    assertAvailable(): void {
      native ??= loadNativeScrypt();
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
};
