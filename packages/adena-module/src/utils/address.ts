import { KeySigner } from '@gnolang/tm2-js-client';
import { fromBech32 } from '../encoding';

export async function publicKeyToAddress(
  publicKey: Uint8Array,
  addressPrefix: string = 'g',
): Promise<string> {
  return new KeySigner(new Uint8Array(), publicKey, addressPrefix).getAddress();
}

export function validateAddress(address: string): boolean {
  try {
    const publicKey = fromBech32(address);
    return Boolean(publicKey?.prefix);
  } catch {
    return false;
  }
}
