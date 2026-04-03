export function arrayToHex(data: Uint8Array) {
  return Buffer.from(data).toString('hex');
}

export function hexToArray(hex: string) {
  return Uint8Array.from(Buffer.from(hex, 'hex'));
}
