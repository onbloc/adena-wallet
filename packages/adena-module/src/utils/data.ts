import { toHex } from '../encoding';

export function arrayToHex(data: Uint8Array) {
  return toHex(data);
}

export function hexToArray(hex: string) {
  return Uint8Array.from(Buffer.from(hex, 'hex'));
}
