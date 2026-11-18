import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { ed25519 } from '@noble/curves/ed25519.js';
import { argon2idAsync } from '@noble/hashes/argon2.js';

import { isNonNullObject } from '../utils';

// Pure-JS replacements for the libsodium primitives this module used. Outputs
// are byte-identical, so data written with libsodium still decrypts.

export interface Argon2idOptions {
  /** Output length in bytes */
  readonly outputLength: number;
  /** An integer between 1 and 4294967295 representing the computational difficulty. */
  readonly opsLimit: number;
  /** Memory limit measured in KiB (like argon2 command line tool) */
  readonly memLimitKib: number;
}

export function isArgon2idOptions(thing: unknown): thing is Argon2idOptions {
  if (!isNonNullObject(thing)) return false;
  if (typeof (thing as Argon2idOptions).outputLength !== 'number') return false;
  if (typeof (thing as Argon2idOptions).opsLimit !== 'number') return false;
  if (typeof (thing as Argon2idOptions).memLimitKib !== 'number') return false;
  return true;
}

const ARGON2ID_SALT_LENGTH = 16;

export class Argon2id {
  public static async execute(
    password: string,
    salt: Uint8Array,
    options: Argon2idOptions
  ): Promise<Uint8Array> {
    // libsodium's crypto_pwhash only accepted 16-byte salts; keep rejecting others.
    if (salt.length !== ARGON2ID_SALT_LENGTH) {
      throw new Error(`invalid salt length ${salt.length}, expected ${ARGON2ID_SALT_LENGTH}`);
    }
    return argon2idAsync(password, salt, {
      t: options.opsLimit,
      m: options.memLimitKib,
      p: 1,
      dkLen: options.outputLength
    });
  }
}

export class Ed25519Keypair {
  // a libsodium privkey has the format `<ed25519 privkey> + <ed25519 pubkey>`
  public static fromLibsodiumPrivkey(libsodiumPrivkey: Uint8Array): Ed25519Keypair {
    if (libsodiumPrivkey.length !== 64) {
      throw new Error(`Unexpected key length ${libsodiumPrivkey.length}. Must be 64.`);
    }
    return new Ed25519Keypair(libsodiumPrivkey.slice(0, 32), libsodiumPrivkey.slice(32, 64));
  }

  public readonly privkey: Uint8Array;
  public readonly pubkey: Uint8Array;

  public constructor(privkey: Uint8Array, pubkey: Uint8Array) {
    this.privkey = privkey;
    this.pubkey = pubkey;
  }

  public toLibsodiumPrivkey(): Uint8Array {
    const privateKeyArray = new Uint8Array(this.privkey.length + this.pubkey.length);
    privateKeyArray.set(this.privkey);
    privateKeyArray.set(this.pubkey, this.privkey.length);
    return privateKeyArray;
  }
}

export class Ed25519 {
  /**
   * Generates a keypair deterministically from a given 32 bytes seed.
   *
   * This seed equals the Ed25519 private key.
   */
  public static async makeKeypair(seed: Uint8Array): Promise<Ed25519Keypair> {
    return new Ed25519Keypair(seed.slice(), ed25519.getPublicKey(seed));
  }

  public static async createSignature(
    message: Uint8Array,
    keyPair: Ed25519Keypair
  ): Promise<Uint8Array> {
    return ed25519.sign(message, keyPair.privkey);
  }

  public static async verifySignature(
    signature: Uint8Array,
    message: Uint8Array,
    pubkey: Uint8Array
  ): Promise<boolean> {
    return ed25519.verify(signature, message, pubkey);
  }
}

/** Nonce length in bytes for all flavours of XChaCha20. */
export const xchacha20NonceLength = 24;

export class Xchacha20poly1305Ietf {
  public static async encrypt(
    message: Uint8Array,
    key: Uint8Array,
    nonce: Uint8Array
  ): Promise<Uint8Array> {
    return xchacha20poly1305(key, nonce).encrypt(message);
  }

  public static async decrypt(
    ciphertext: Uint8Array,
    key: Uint8Array,
    nonce: Uint8Array
  ): Promise<Uint8Array> {
    return xchacha20poly1305(key, nonce).decrypt(ciphertext);
  }
}

/** Overwrites key material in place, like `sodium.memzero`. */
export function zeroize(bytes: Uint8Array): void {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError('Only Uint8Array instances can be wiped');
  }
  bytes.fill(0);
}
