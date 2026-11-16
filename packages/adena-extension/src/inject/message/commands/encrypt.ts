import { MemoryProvider } from '@common/provider/memory/memory-provider';

const MEMORY_KEY = 'encryptKey';

// Session-storage copy of the in-memory key, exported as a JWK.
//
// The key only ever lived in the background's MemoryProvider, which is a plain
// Map created when the service worker starts. Chrome (and Firefox's event
// page) restart that worker whenever they like — after a sleep/resume, under
// memory pressure, on an extension reload. Every restart emptied the map, and
// the next `getInMemoryKey` minted a brand-new key. The password in
// chrome.storage.session was encrypted with the old one, so decrypting it
// threw OperationError, `isLocked()` reported true, and the popup showed the
// login screen long before the auto-lock alarm was due.
//
// chrome.storage.session has the lifetime we actually want: memory-only,
// cleared on browser restart and by the auto-lock alarm, but it survives a
// worker restart. Keeping the key there next to the ciphertext does not widen
// who can decrypt — any context able to read session storage can already ask
// the background to decrypt on its behalf.
const SESSION_KEY = 'ENCRYPT_KEY_JWK';

const KEY_LENGTH = 256; // AES-256 key length
const IV_LENGTH = 12; // GCM nonce length (12 bytes is recommended)

const AES_GCM_ALGORITHM: AesKeyGenParams = { name: 'AES-GCM', length: KEY_LENGTH };
const KEY_USAGES: KeyUsage[] = ['encrypt', 'decrypt'];

// Cold-start loads and clears run one at a time, in call order. Each of them
// spans several awaits (storage reads and writes, key import/export), and
// interleaving them breaks the invariant that the in-memory key and its
// session copy exist together: a load finishing after a lock would put a key
// back into memory whose session copy the lock just removed, and the next
// unlock would then encrypt with a key no later worker restart can restore —
// the very failure this module exists to prevent. Serializing also collapses
// concurrent cold-start calls: the second one finds the key the first
// installed instead of minting its own.
let keyLock: Promise<unknown> = Promise.resolve();

function withKeyLock<T>(task: () => Promise<T>): Promise<T> {
  const run = keyLock.then(task, task);
  keyLock = run.catch(() => undefined);
  return run;
}

export async function getInMemoryKey(memoryProvider: MemoryProvider): Promise<CryptoKey | null> {
  const cached = memoryProvider?.get<CryptoKey>(MEMORY_KEY) || null;
  if (cached) {
    return cached;
  }

  return withKeyLock(async () => {
    // Re-check under the lock: a call queued behind another cold start must
    // return the key that one installed rather than load again.
    const installed = memoryProvider?.get<CryptoKey>(MEMORY_KEY) || null;
    if (installed) {
      return installed;
    }

    return restoreOrGenerateKey(memoryProvider);
  });
}

export async function clearInMemoryKey(memoryProvider: MemoryProvider): Promise<void> {
  return withKeyLock(async () => {
    const random = await generateInMemoryKey();
    memoryProvider.set(MEMORY_KEY, random);
    memoryProvider.set(MEMORY_KEY, null);

    try {
      await chrome.storage.session.remove(SESSION_KEY);
    } catch (e) {
      console.warn('Failed to remove the session copy of the encrypt key', e);
    }
  });
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
  if (!key || !iv || !encryptedPassword) {
    return '';
  }

  const encryptedData = Buffer.from(encryptedPassword, 'base64');
  const ivBytes = Buffer.from(iv, 'base64');
  const dec = new TextDecoder();

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBytes,
    },
    key,
    encryptedData,
  );

  return dec.decode(decrypted);
};

async function restoreOrGenerateKey(memoryProvider: MemoryProvider): Promise<CryptoKey | null> {
  try {
    let key = await restoreSessionKey();
    if (!key) {
      key = await generateInMemoryKey();
      await persistSessionKey(key);
    }

    memoryProvider.set(MEMORY_KEY, key);

    return memoryProvider.get<CryptoKey>(MEMORY_KEY) || null;
  } catch (e) {
    console.error(e);
  }

  return null;
}

// A missing or unreadable session copy is not an error: it is simply the
// state before the first unlock, or after a lock. Hand back null and let the
// caller mint a fresh key.
async function restoreSessionKey(): Promise<CryptoKey | null> {
  try {
    const stored = await chrome.storage.session.get(SESSION_KEY);
    const jwk = stored?.[SESSION_KEY];
    if (!jwk || typeof jwk !== 'object') {
      return null;
    }

    return await crypto.subtle.importKey(
      'jwk',
      jwk as JsonWebKey,
      AES_GCM_ALGORITHM,
      true,
      KEY_USAGES,
    );
  } catch (e) {
    console.warn('Failed to restore the encrypt key from session storage', e);
    return null;
  }
}

// Best effort: if the copy cannot be written, the key still works for this
// worker lifetime exactly as before — it just will not survive a restart.
async function persistSessionKey(key: CryptoKey): Promise<void> {
  try {
    const jwk = await crypto.subtle.exportKey('jwk', key);
    await chrome.storage.session.set({ [SESSION_KEY]: jwk });
  } catch (e) {
    console.warn('Failed to persist the encrypt key to session storage', e);
  }
}

const generateInMemoryKey = async (): Promise<CryptoKey> => {
  return crypto.subtle.generateKey(AES_GCM_ALGORITHM, true, KEY_USAGES);
};
