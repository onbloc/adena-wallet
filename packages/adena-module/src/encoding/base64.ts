import { base64ToUint8Array, uint8ArrayToBase64 } from '@gnolang/tm2-js-client';

export function toBase64(data: Uint8Array): string {
  return uint8ArrayToBase64(data);
}

export function fromBase64(base64String: string): Uint8Array {
  if (!base64String.match(/^[a-zA-Z0-9+/]*={0,2}$/)) {
    throw new Error('Invalid base64 string format');
  }
  return base64ToUint8Array(base64String);
}
