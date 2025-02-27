import { MemoryProvider } from '@common/provider/memory/memory-provider';

const MEMORY_KEY = 'encryptKey';

const KEY_LENGTH = 256; // AES-256 key length
const IV_LENGTH = 12; // GCM nonce length (12 bytes is recommended)

export async function getInMemoryKey(memoryProvider: MemoryProvider): Promise<CryptoKey | null> {
  const key = memoryProvider.get(MEMORY_KEY) || null;
  if (!key) {
    const generated = await generateInMemoryKey();
    memoryProvider.set(MEMORY_KEY, generated);
  }

  return memoryProvider.get(MEMORY_KEY) || null;
}

export async function clearInMemoryKey(memoryProvider: MemoryProvider): Promise<void> {
  const random = await generateInMemoryKey();
  memoryProvider.set(MEMORY_KEY, null);
}

// Encrypts a password using AES-GCM
export const encryptPassword = async (
  key: CryptoKey,
  password: string,
): Promise<{ encryptedKey: string; encryptedPassword: string }> => {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const enc = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    enc.encode(password),
  );

  return {
    encryptedKey: Buffer.from(iv).toString('base64'),
    encryptedPassword: Buffer.from(encrypted).toString('base64'),
  };
};

// Decrypts a password using AES-GCM
export const decryptPassword = async (
  key: CryptoKey,
  iv: string,
  encryptedPassword: string,
): Promise<string> => {
  console.log('1');
  const encryptedData = Buffer.from(encryptedPassword, 'base64');
  console.log('12');
  const ivBytes = Buffer.from(iv, 'base64');
  console.log('123');
  const dec = new TextDecoder();

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes,
    },
    key,
    encryptedData,
  );
  console.log('1234');

  return dec.decode(decrypted);
};

const generateInMemoryKey = async (): Promise<CryptoKey> => {
  return crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: KEY_LENGTH,
    },
    true,
    ['encrypt', 'decrypt'],
  );
};
