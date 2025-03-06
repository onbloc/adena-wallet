export function bytesToBase64(bytes: number[]): string {
  return Buffer.from(bytes).toString('base64');
}

export function base64ToBytes(base64: string): number[] {
  return Array.from(Buffer.from(base64, 'base64'));
}

export function stringFromBase64(base64: string): string {
  return Buffer.from(base64, 'base64').toString('utf-8');
}

export function stringToBase64(str: string): string {
  return Buffer.from(str).toString('base64');
}
