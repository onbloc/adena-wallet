/**
 * A secp256k1 private key as 64 hex characters, optionally prefixed with 0x.
 * Checked strictly before it reaches PrivateKeyKeyring.fromPrivateKeyStr,
 * whose Buffer.from(hex) silently drops everything after the first non-hex
 * character and would build a different, wrong key from a typo.
 */
export function normalizePrivateKey(input: string): string | null {
  const trimmed = input.trim();
  const hex =
    trimmed.startsWith('0x') || trimmed.startsWith('0X')
      ? trimmed.slice(2)
      : trimmed;
  return /^[0-9a-fA-F]{64}$/.test(hex) ? hex.toLowerCase() : null;
}
