import { fromBech32 } from '@cosmjs/encoding';

const ADDRESS_BYTE_LENGTH = 20;

export const isValidAddress = (address: string, prefix = 'g'): boolean => {
  try {
    const decoded = fromBech32(address);

    return decoded.prefix === prefix && decoded.data.length === ADDRESS_BYTE_LENGTH;
  }
  catch {
    return false;
  }
};

// Display-only shortening; copy and signing always use the full string.
export const shortenAddress = (address: string, head = 6, tail = 4): string =>
  address.length <= head + tail + 1 ? address : `${address.slice(0, head)}…${address.slice(-tail)}`;

export const getInitials = (name: string): string => {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return '?';
  }

  const initials = words.length === 1 ? words[0].slice(0, 2) : `${words[0][0]}${words[1][0]}`;

  return initials.toUpperCase();
};
