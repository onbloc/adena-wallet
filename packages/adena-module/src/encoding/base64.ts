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

// URL-safe alphabet without padding: what `sodium.to_base64` wrote by default.
export function toBase64Url(data: Uint8Array): string {
  return toBase64(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(base64UrlString: string): Uint8Array {
  if (!/^[a-zA-Z0-9_-]*$/.test(base64UrlString) || base64UrlString.length % 4 === 1) {
    throw new Error('Invalid base64url string format');
  }
  const base64 = base64UrlString.replace(/-/g, '+').replace(/_/g, '/');
  return base64js.toByteArray(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
}
