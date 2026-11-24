import { fromBech32, toBech32 } from '@cosmjs/encoding';

const ADDRESS_BYTE_LENGTH = 20;

// Canonical lowercase bech32, or null. All-uppercase input (e.g. QR) is accepted; mixed case is rejected (BIP-173).
export const normalizeAddress = (address: string, prefix = 'g'): string | null => {
  try {
    const decoded = fromBech32(address.trim());

    return decoded.prefix === prefix && decoded.data.length === ADDRESS_BYTE_LENGTH ? toBech32(prefix, decoded.data) : null;
  }
  catch {
    return null;
  }
};

// Only the canonical form is valid, so anything signed or compared is already normalized.
export const isValidAddress = (address: string, prefix = 'g'): boolean => normalizeAddress(address, prefix) === address;

// Display-only truncation; copy and signing always use the full string.
export const formatAddress = (address: string, length = 6): string =>
  address.length < 40 ? address : `${address.slice(0, length)}...${address.slice(-length)}`;

// Shorter values stay whole rather than coming out no shorter with the ellipsis.
export const formatHash = (hash: string, length = 6): string =>
  hash.length <= length * 2 + 3 ? hash : `${hash.slice(0, length)}...${hash.slice(-length)}`;

export const getInitials = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return '?';
  }

  const initials = words.length === 1 ? words[0].slice(0, 2) : `${words[0][0]}${words[1][0]}`;

  return initials.toUpperCase();
};
