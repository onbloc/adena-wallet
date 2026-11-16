import { toHexHash } from '@common/utils/hash-utils';

/**
 * Builds the `hash` query value for an RPC `/tx` lookup, which expects a
 * `0x`-prefixed hex hash.
 */
export function makeRpcHashParam(hash: string): string {
  return '0x' + toHexHash(hash);
}

export function parseABCIValue(str: string): string[] {
  try {
    const decodedData = window.atob(str);

    if (!decodedData) {
      console.warn('Decoded data is empty or null.');
      return [];
    }

    const pattern = /\((\d+|"-?\d+") \w+\)/g;
    const results: string[] = [];
    let match;

    while ((match = pattern.exec(decodedData)) !== null) {
      let value = match[1];

      value = value.replace(/"/g, '');

      results.push(value);
    }

    return results;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'InvalidCharacterError') {
      console.error('Invalid Base64 string:', str);
    } else {
      console.error('Failed to parse ABCI value:', error);
    }
  }
  return [];
}
