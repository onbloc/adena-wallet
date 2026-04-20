import { fromBech32 } from '../encoding';

/**
 * Validate a bech32 address with a required prefix match.
 * Rejects addresses whose prefix differs from `expectedPrefix`
 * (e.g. prevents sending to `gno1...` on an AtomOne chain).
 */
export function validateCosmosAddress(address: string, expectedPrefix: string): boolean {
  try {
    const { prefix } = fromBech32(address);
    return prefix === expectedPrefix;
  } catch {
    return false;
  }
}
