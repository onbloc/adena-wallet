import * as base64js from 'base64-js';

export function toBase64(data: Uint8Array): string {
  return base64js.fromByteArray(data);
}

export function fromBase64(base64String: string): Uint8Array {
  if (!base64String.match(/^[a-zA-Z0-9+/]*={0,2}$/)) {
    throw new Error('Invalid base64 string format');
  }
  return base64js.toByteArray(base64String);
}

/**
 * Encodes to the URL-safe, unpadded base64 that libsodium.js produces by default
 * (`sodium.to_base64`). Vault ciphertexts and nonces are stored in this form, so
 * every platform must encode them identically.
 */
export function toBase64UrlNoPadding(data: Uint8Array): string {
  return toBase64(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Inverse of {@link toBase64UrlNoPadding}; rejects standard or padded base64 like libsodium does. */
export function fromBase64UrlNoPadding(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(value) || value.length % 4 === 1) {
    throw new Error('Invalid base64url string format');
  }
  const standard = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = standard + '='.repeat((4 - (standard.length % 4)) % 4);
  return fromBase64(padded);
}
