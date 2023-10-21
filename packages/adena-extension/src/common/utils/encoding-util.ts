export function bytesToBase64(bytes: number[]) {
  return Buffer.from(bytes).toString('base64');
}
