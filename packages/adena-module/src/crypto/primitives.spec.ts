import sodium from 'libsodium-wrappers-sumo';

import { fromBase64Url, toBase64Url } from '../encoding';
import { Argon2id, Ed25519, Xchacha20poly1305Ietf, zeroize } from './primitives';
import { Random } from './random';

// libsodium wrote the data this module must keep reading, so it stays as the
// reference implementation for these tests.

const PASSWORDS = ['', 'PASSWORD', '한글 비밀번호 🔐', 'x'.repeat(257)];

describe('noble primitives match libsodium', () => {
  beforeAll(async () => {
    await sodium.ready;
  });

  it.each(PASSWORDS)('derives the same Argon2id key for %j', async (password) => {
    const salt = Random.getBytes(16);
    const options = { outputLength: 32, opsLimit: 2, memLimitKib: 64 };

    const expected = sodium.crypto_pwhash(
      options.outputLength,
      password,
      salt,
      options.opsLimit,
      options.memLimitKib * 1024,
      sodium.crypto_pwhash_ALG_ARGON2ID13
    );
    expect(await Argon2id.execute(password, salt, options)).toEqual(expected);
  });

  it('derives the same Argon2id key with the wallet parameters', async () => {
    const salt = new Uint8Array(16).fill(7);
    const options = { outputLength: 32, opsLimit: 24, memLimitKib: 12 * 1024 };

    const expected = sodium.crypto_pwhash(32, 'PASSWORD', salt, 24, 12 * 1024 * 1024, sodium.crypto_pwhash_ALG_ARGON2ID13);
    expect(await Argon2id.execute('PASSWORD', salt, options)).toEqual(expected);
  });

  it('rejects salts libsodium rejected', async () => {
    const options = { outputLength: 32, opsLimit: 2, memLimitKib: 64 };
    await expect(Argon2id.execute('PASSWORD', new Uint8Array(8), options)).rejects.toThrow();
    await expect(Argon2id.execute('PASSWORD', new Uint8Array(32), options)).rejects.toThrow();
  });

  it.each([0, 1, 15, 16, 1000])('interoperates with XChaCha20-Poly1305 for %i bytes', async (length) => {
    const key = Random.getBytes(32);
    const nonce = Random.getBytes(24);
    const message = Random.getBytes(length);

    const fromSodium = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(message, null, null, nonce, key);
    expect(await Xchacha20poly1305Ietf.encrypt(message, key, nonce)).toEqual(fromSodium);
    expect(await Xchacha20poly1305Ietf.decrypt(fromSodium, key, nonce)).toEqual(message);
  });

  it('rejects a tampered XChaCha20-Poly1305 ciphertext', async () => {
    const key = Random.getBytes(32);
    const nonce = Random.getBytes(24);
    const ciphertext = await Xchacha20poly1305Ietf.encrypt(Random.getBytes(64), key, nonce);
    ciphertext[0] ^= 0xff;

    await expect(Xchacha20poly1305Ietf.decrypt(ciphertext, key, nonce)).rejects.toThrow();
  });

  it('produces the same Ed25519 keys and signatures', async () => {
    const seed = Random.getBytes(32);
    const message = Random.getBytes(100);
    const expected = sodium.crypto_sign_seed_keypair(seed);

    const keypair = await Ed25519.makeKeypair(seed);
    expect(keypair.toLibsodiumPrivkey()).toEqual(expected.privateKey);

    const signature = await Ed25519.createSignature(message, keypair);
    expect(signature).toEqual(sodium.crypto_sign_detached(message, expected.privateKey));
    expect(await Ed25519.verifySignature(signature, message, keypair.pubkey)).toBe(true);
    expect(sodium.crypto_sign_verify_detached(signature, message, expected.publicKey)).toBe(true);
  });

  it.each([0, 1, 2, 3, 24, 100])('encodes %i bytes as sodium.to_base64 does', (length) => {
    const bytes = Random.getBytes(length);
    const encoded = sodium.to_base64(bytes);

    expect(toBase64Url(bytes)).toBe(encoded);
    expect(fromBase64Url(encoded)).toEqual(bytes);
  });

  it.each(['+/+/AAE', '-_-_AAE=', 'A'])('rejects %j as sodium.from_base64 does', (input) => {
    expect(() => sodium.from_base64(input)).toThrow();
    expect(() => fromBase64Url(input)).toThrow();
  });

  it('zeroizes in place and rejects non-byte arrays as sodium.memzero does', () => {
    const bytes = Random.getBytes(32);
    zeroize(bytes);
    expect(bytes.every(byte => byte === 0)).toBe(true);
    expect(() => zeroize([1, 2, 3] as unknown as Uint8Array)).toThrow(TypeError);
    expect(() => sodium.memzero([1, 2, 3] as unknown as Uint8Array)).toThrow(TypeError);
  });
});
