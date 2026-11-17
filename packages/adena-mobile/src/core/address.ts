import {fromBech32} from 'adena-module';

/** True only for a well-formed bech32 address with the network's prefix (e.g. "g"). */
export function isAddressForNetwork(address: string, prefix: string): boolean {
  try {
    return fromBech32(address.trim()).prefix === prefix;
  } catch {
    return false;
  }
}
