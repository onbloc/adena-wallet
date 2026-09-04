import { fromBase64, toHex } from 'adena-module';

const HASH_BYTE_LENGTH = 32;
const HEX_HASH_PATTERN = /^(?:0x)?[0-9a-fA-F]{64}$/;
const BASE64_HASH_PATTERN = /^[A-Za-z0-9+/]{43}=$/;

export const isHexHash = (hash: string): boolean => HEX_HASH_PATTERN.test(hash);

export const isBase64Hash = (hash: string): boolean => BASE64_HASH_PATTERN.test(hash);

/**
 * Normalize a block or transaction hash to lowercase hex without a `0x` prefix.
 * Values that are neither a 32-byte hex nor a 32-byte base64 hash (Cosmos
 * hashes, empty values) are returned unchanged.
 */
export const toHexHash = (hash: string): string => {
  if (!hash) {
    return hash;
  }

  if (isHexHash(hash)) {
    return hash.replace(/^0x/, '').toLowerCase();
  }

  if (!isBase64Hash(hash)) {
    return hash;
  }

  try {
    const bytes = fromBase64(hash);
    if (bytes.length !== HASH_BYTE_LENGTH) {
      return hash;
    }

    return toHex(bytes);
  } catch {
    return hash;
  }
};
