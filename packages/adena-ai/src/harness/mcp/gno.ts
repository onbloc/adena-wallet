import { z } from 'zod';

export const GNO_MAINNET_CHAIN = 'gnoland-1';
export const gnoPublicAddress = z.string().regex(/^g1[023456789acdefghjklmnpqrstuvwxyz]{38}$/);

/** Verify a canonical Gno Bech32 account address, including its checksum. */
export function isValidGnoAddress(address: string): boolean {
  if (!gnoPublicAddress.safeParse(address).success) return false;
  const alphabet = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
  const generator = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let checksum = 1;
  for (const value of [3, 0, 7, ...Array.from(address.slice(2), character => alphabet.indexOf(character))]) {
    const top = checksum >>> 25;
    checksum = ((checksum & 0x1ffffff) << 5) ^ value;
    for (let bit = 0; bit < 5; bit++) if ((top >>> bit) & 1) checksum ^= generator[bit];
  }
  return checksum === 1;
}
