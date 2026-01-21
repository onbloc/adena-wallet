import { KeySigner } from '@gnolang/tm2-js-client';
import { ripemd160, sha256 } from '../crypto';
import { fromBech32, toBech32 } from '../encoding';

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

/**
 * Generate address bytes from secp256k1 public key.
 */
export function secp256k1PubKeyToAddressBytes(publicKey: Uint8Array): Uint8Array {
  const sha256Hash = sha256(publicKey);

  return ripemd160(sha256Hash);
}

/**
 * Generate bech32 address from secp256k1 public key.
 */
export function secp256k1PubKeyToAddress(
  publicKey: Uint8Array,
  addressPrefix: string = 'g',
): string {
  const addressBytes = secp256k1PubKeyToAddressBytes(publicKey);
  return toBech32(addressPrefix, addressBytes);
}
