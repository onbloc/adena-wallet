/**
 * Converts a base64-encoded hash to hex.
 * Use when calling the tx endpoint of an RPC.
 */
export function makeHexByBase64(base64Hash: string): string {
  const buffer = Buffer.from(base64Hash, 'base64');
  return '0x' + buffer.toString('hex');
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
