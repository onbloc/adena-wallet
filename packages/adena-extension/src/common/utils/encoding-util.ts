export function bytesToBase64(bytes: number[]): string {
  return Buffer.from(bytes).toString('base64');
}
