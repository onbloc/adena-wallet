import {
  pbkdf2Async,
} from "@noble/hashes/pbkdf2.js";
import {
  sha512,
} from "@noble/hashes/sha2.js";

/**
 * A pbkdf2 implementation for BIP39. This is not exported at package level and thus a private API.
 */
export async function pbkdf2Sha512(
  secret: Uint8Array,
  salt: Uint8Array,
  iterations: number,
  keylen: number,
): Promise<Uint8Array> {
  return pbkdf2Async(sha512, secret, salt, {
    c: iterations,
    dkLen: keylen,
  });
}
