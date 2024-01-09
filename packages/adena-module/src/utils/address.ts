import { KeySigner } from '@gnolang/tm2-js-client';

export async function publicKeyToAddress(
  publicKey: Uint8Array,
  addressPrefix: string = 'g',
): Promise<string> {
  return new KeySigner(new Uint8Array(), publicKey, addressPrefix).getAddress();
}
