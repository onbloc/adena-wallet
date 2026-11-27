// Test helper: adena-module with the same XChaCha20-Poly1305 sealing but a
// SHA-256 key instead of Argon2id, so specs that write often stay fast. One
// spec (agent-host-settings.argon2.spec.ts) keeps the real derivation.
import sodium from 'libsodium-wrappers-sumo';

type AdenaModule = typeof import('adena-module');

export const withFastAead = async (actual: AdenaModule): Promise<AdenaModule> => {
  await sodium.ready;
  const keyOf = (password: string, salt: Uint8Array): Uint8Array =>
    actual.sha256(new Uint8Array([...new TextEncoder().encode(password), ...salt]));

  return {
    ...actual,
    encryptXChacha20: async (value: string, password: string, salt: Uint8Array) => {
      const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
      const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
        new TextEncoder().encode(value),
        null,
        null,
        nonce,
        keyOf(password, salt),
      );
      return { ciphertext: sodium.to_base64(ciphertext), nonce: sodium.to_base64(nonce) };
    },
    decryptXChacha20: async (data, password: string, salt: Uint8Array) =>
      new TextDecoder().decode(
        sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
          null,
          sodium.from_base64(data.ciphertext),
          null,
          sodium.from_base64(data.nonce),
          keyOf(password, salt),
        ),
      ),
  };
};
