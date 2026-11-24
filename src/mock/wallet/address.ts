// Addresses are compared in lowercase. Only the 'g1' prefix and the length are checked:
// no character set, no checksum (assumed format).
const ADDRESS_PREFIX = 'g1';

export const ADDRESS_LENGTH = 40;

/** Shown to the user (via the model) when an address has the wrong length. */
export const INVALID_ADDRESS_LENGTH_MESSAGE = 'The address length is not valid. Please check it again.';

export const normalizeAddress = (address: string) => address.toLowerCase();

export const isValidAddress = (address: string) => {
  const normalized = normalizeAddress(address);
  return normalized.length === ADDRESS_LENGTH && normalized.startsWith(ADDRESS_PREFIX);
};
