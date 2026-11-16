import { validateAddress } from 'adena-module';

import { MAX_ARBITRARY_MESSAGE_BYTES, SignArbitraryParams } from '@inject/types';

// Request-level checks for `SignArbitrary`. Whether the signer is the account
// actually connected, and whether the signing key derives it, are decided
// later — here we only reject requests that are malformed on their face.

export function validateSignArbitraryParams(params: unknown): params is SignArbitraryParams {
  if (typeof params !== 'object' || params === null) {
    return false;
  }

  const candidate = params as Record<string, unknown>;
  if (typeof candidate.signer !== 'string' || !validateAddress(candidate.signer)) {
    return false;
  }

  if (typeof candidate.data !== 'string' || candidate.data.length === 0) {
    return false;
  }

  // Measured in UTF-8 bytes rather than characters: the popup URL budget this
  // protects is spent in bytes, and one emoji costs four of them.
  return new TextEncoder().encode(candidate.data).length <= MAX_ARBITRARY_MESSAGE_BYTES;
}
