import crypto from 'crypto';

export function generateRandomHex(): string {
  return crypto.randomBytes(32).toString('hex');
}
