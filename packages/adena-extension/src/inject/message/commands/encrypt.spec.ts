/**
 * @jest-environment node
 */
import { webcrypto } from 'crypto';

import { MemoryProvider } from '@common/provider/memory/memory-provider';
import { clearInMemoryKey, decryptPassword, encryptPassword, getInMemoryKey } from './encrypt';

type SessionArea = {
  get: jest.Mock;
  set: jest.Mock;
  remove: jest.Mock;
};

// In-memory stand-in for chrome.storage.session: it outlives a "worker
// restart" (a fresh MemoryProvider) exactly like the real one does.
const mockSessionStorage = (): { area: SessionArea; store: Record<string, unknown> } => {
  const store: Record<string, unknown> = {};
  const area: SessionArea = {
    get: jest.fn(async (key: string) => (key in store ? { [key]: store[key] } : {})),
    set: jest.fn(async (items: Record<string, unknown>) => {
      Object.assign(store, items);
    }),
    remove: jest.fn(async (key: string) => {
      delete store[key];
    }),
  };
  (globalThis as unknown as { chrome: unknown }).chrome = { storage: { session: area } };
  return { area, store };
};

beforeAll(() => {
  if (!globalThis.crypto?.subtle) {
    Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
  }
});

afterEach(() => {
  delete (globalThis as unknown as { chrome?: unknown }).chrome;
});

describe('getInMemoryKey', () => {
  it('generates a key on first use and persists it to session storage', async () => {
    const { store } = mockSessionStorage();
    const provider = new MemoryProvider();

    const key = await getInMemoryKey(provider);

    expect(key).not.toBeNull();
    expect(store.ENCRYPT_KEY_JWK).toMatchObject({ kty: 'oct', alg: 'A256GCM' });
  });

  it('returns the cached key without touching session storage once loaded', async () => {
    const { area } = mockSessionStorage();
    const provider = new MemoryProvider();

    const first = await getInMemoryKey(provider);
    const second = await getInMemoryKey(provider);

    expect(second).toBe(first);
    expect(area.get).toHaveBeenCalledTimes(1);
  });

  // The bug: a restarted worker used to mint a new key, so the password in
  // session storage could no longer be decrypted and the wallet showed as
  // locked before the auto-lock timer was due.
  it('restores the same key after the worker memory is lost', async () => {
    mockSessionStorage();

    // First worker lifetime: unlock encrypts the password.
    const firstKey = await getInMemoryKey(new MemoryProvider());
    expect(firstKey).not.toBeNull();
    const { encryptedKey: iv, encryptedPassword } = await encryptPassword(
      firstKey as CryptoKey,
      'hunter2',
    );

    // Worker restart: a brand-new, empty MemoryProvider, same session storage.
    const restoredKey = await getInMemoryKey(new MemoryProvider());

    expect(restoredKey).not.toBeNull();
    await expect(decryptPassword(restoredKey as CryptoKey, iv, encryptedPassword)).resolves.toBe(
      'hunter2',
    );
  });

  it('collapses concurrent cold-start calls into a single key', async () => {
    const { area } = mockSessionStorage();
    const provider = new MemoryProvider();

    const [a, b] = await Promise.all([getInMemoryKey(provider), getInMemoryKey(provider)]);

    expect(a).not.toBeNull();
    expect(b).toBe(a);
    expect(area.set).toHaveBeenCalledTimes(1);
  });

  it('mints a fresh key when the session copy is unreadable', async () => {
    const { store } = mockSessionStorage();
    store.ENCRYPT_KEY_JWK = { kty: 'oct', k: 'not-a-valid-key', alg: 'A256GCM' };
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    const key = await getInMemoryKey(new MemoryProvider());

    expect(key).not.toBeNull();
    expect(store.ENCRYPT_KEY_JWK).not.toMatchObject({ k: 'not-a-valid-key' });
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});

describe('clearInMemoryKey', () => {
  it('drops both the in-memory key and its session copy', async () => {
    const { store } = mockSessionStorage();
    const provider = new MemoryProvider();

    const before = await getInMemoryKey(provider);
    await clearInMemoryKey(provider);

    expect(store.ENCRYPT_KEY_JWK).toBeUndefined();
    expect(provider.get('encryptKey')).toBeNull();

    // The next key is a new one: the old ciphertext must not decrypt anymore.
    const after = await getInMemoryKey(provider);
    expect(after).not.toBe(before);
  });
});

// A lock (manual or auto) can land while a cold-start load is still awaiting
// storage. Whatever the interleaving, the lock must leave neither a key in
// memory nor a copy in session storage, and the next unlock must get a key
// that a later worker restart can restore.
describe('lock racing a cold-start load', () => {
  const deferred = <T,>(): { promise: Promise<T>; resolve: (value: T) => void } => {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((r) => {
      resolve = r;
    });
    return { promise, resolve };
  };

  // Give the lock the chance to finish before the load's held-open storage
  // call resolves. With loads and clears serialized the lock cannot finish
  // first (it is queued behind the load), so this falls through after a short
  // wait. Without serialization it returns as soon as the lock has run, which
  // is exactly the interleaving the fix guards against.
  const letLockGoFirst = (lock: Promise<void>): Promise<unknown> =>
    Promise.race([lock, new Promise((resolve) => setTimeout(resolve, 50))]);

  it('leaves nothing behind when the lock lands during the session read', async () => {
    const { area, store } = mockSessionStorage();
    await getInMemoryKey(new MemoryProvider());
    const jwk = store.ENCRYPT_KEY_JWK;

    // Worker restart; the restore's session read is held open.
    const provider = new MemoryProvider();
    const read = deferred<Record<string, unknown>>();
    area.get.mockImplementationOnce(() => read.promise);
    const load = getInMemoryKey(provider);
    const lock = clearInMemoryKey(provider);
    await letLockGoFirst(lock);
    read.resolve({ ENCRYPT_KEY_JWK: jwk });
    await Promise.all([load, lock]);

    expect(provider.get('encryptKey')).toBeNull();
    expect(store.ENCRYPT_KEY_JWK).toBeUndefined();

    // Next unlock: a fresh key with a session copy, so a further worker
    // restart still restores it.
    const nextKey = await getInMemoryKey(provider);
    expect(nextKey).not.toBeNull();
    expect(store.ENCRYPT_KEY_JWK).toBeDefined();
    expect(store.ENCRYPT_KEY_JWK).not.toEqual(jwk);
    const ciphertext = await encryptPassword(nextKey as CryptoKey, 'hunter2');
    const restored = await getInMemoryKey(new MemoryProvider());
    await expect(
      decryptPassword(restored as CryptoKey, ciphertext.encryptedKey, ciphertext.encryptedPassword),
    ).resolves.toBe('hunter2');
  });

  it('leaves nothing behind when the lock lands during the session write', async () => {
    const { area, store } = mockSessionStorage();
    const provider = new MemoryProvider();

    // First unlock; the generated key's session write is held open.
    const write = deferred<void>();
    area.set.mockImplementationOnce(async (items: Record<string, unknown>) => {
      await write.promise;
      Object.assign(store, items);
    });
    const load = getInMemoryKey(provider);
    const lock = clearInMemoryKey(provider);
    await letLockGoFirst(lock);
    write.resolve();
    await Promise.all([load, lock]);

    expect(provider.get('encryptKey')).toBeNull();
    expect(store.ENCRYPT_KEY_JWK).toBeUndefined();
  });
});
