import * as sodium from 'react-native-libsodium';

const MAX_BYTES = 65536; // Web Crypto's per-call limit

type IntegerTypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array;

/**
 * Hermes ships no `crypto.getRandomValues`. Libraries we depend on (uuid,
 * @noble/*, tm2-js-client) call it for key material, so it is backed by
 * libsodium's `randombytes_buf`, which reads the OS CSPRNG. There is no
 * Math.random fallback: if the native module is missing this throws.
 */
export function getRandomValues<T extends IntegerTypedArray>(array: T): T {
  if (array.byteLength > MAX_BYTES) {
    throw new Error(
      `getRandomValues: ${array.byteLength} bytes exceeds ${MAX_BYTES}`,
    );
  }
  const random = sodium.randombytes_buf(array.byteLength);
  new Uint8Array(array.buffer, array.byteOffset, array.byteLength).set(random);
  random.fill(0);
  return array;
}

export function installRandomValuesPolyfill(): void {
  const globalObject = globalThis as {crypto?: {getRandomValues?: unknown}};
  if (!globalObject.crypto) {
    globalObject.crypto = {};
  }
  globalObject.crypto.getRandomValues = getRandomValues;
}
