export function toHex(data: Uint8Array): string {
  let out = '';
  const bytes = data.entries();

  let byte = bytes.next();
  while (!byte.done) {
    out += ('0' + byte.value[1].toString(16)).slice(-2);
    byte = bytes.next();
  }
  return out;
}

export function fromHex(hexstring: string): Uint8Array {
  if (hexstring.length % 2 !== 0) {
    throw new Error('hex string length must be a multiple of 2');
  }

  const out = new Uint8Array(hexstring.length / 2);
  for (let i = 0; i < out.length; i++) {
    const j = 2 * i;
    const hexByteAsString = hexstring.slice(j, j + 2);
    if (!hexByteAsString.match(/[0-9a-f]{2}/i)) {
      throw new Error('hex string contains invalid characters');
    }
    out[i] = parseInt(hexByteAsString, 16);
  }
  return out;
}
