import { fromBase64, toBase64 } from '@cosmjs/encoding';

export const encodeBase64Url = (text: string): string =>
  toBase64(new TextEncoder().encode(text)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export const decodeBase64Url = (value: string): string => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

  return new TextDecoder().decode(fromBase64(padded));
};
