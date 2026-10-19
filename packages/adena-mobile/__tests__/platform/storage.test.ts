import * as Keychain from 'react-native-keychain';

const mockMmkvFiles = new Map<
  string,
  {key?: string; values: Map<string, any>}
>();

jest.mock('react-native-mmkv', () => ({
  MMKV: class {
    private readonly file: {key?: string; values: Map<string, any>};

    constructor({id, encryptionKey}: {id: string; encryptionKey?: string}) {
      const existing = mockMmkvFiles.get(id);
      // What react-native-mmkv 3.3 did on the iOS simulator: files written
      // with another key come up empty and are started over.
      if (!existing || existing.key !== encryptionKey) {
        mockMmkvFiles.set(id, {key: encryptionKey, values: new Map()});
      }
      this.file = mockMmkvFiles.get(id)!;
    }

    getString(key: string) {
      return this.file.values.get(key);
    }

    getBoolean(key: string) {
      return this.file.values.get(key);
    }

    set(key: string, value: any) {
      this.file.values.set(key, value);
    }

    delete(key: string) {
      this.file.values.delete(key);
    }

    getAllKeys() {
      return [...this.file.values.keys()];
    }
  },
}));

import {MemoryStorage, openSecureStorage} from '../../src/platform/storage';
import {
  CURRENT_SCHEMA_VERSION,
  SCHEMA_VERSION_KEY,
} from '../../src/platform/storage-schema';

const keychain = Keychain as unknown as typeof Keychain & {
  __reset(): void;
  __setHardwareAvailable(available: boolean): void;
  __items: Map<string, {password: string; options: any}>;
};

beforeEach(() => {
  mockMmkvFiles.clear();
  keychain.__reset();
});

describe('openSecureStorage', () => {
  it('creates a device-only storage key and round-trips JSON values', async () => {
    const {local, hardwareBacked} = await openSecureStorage();
    await local.set('NETWORKS', [{id: 'test12'}]);

    expect(await local.get('NETWORKS')).toEqual([{id: 'test12'}]);
    expect(hardwareBacked).toBe(true);

    const [item] = [...keychain.__items.values()];
    expect(item.password).toHaveLength(16);
    expect(item.options).toMatchObject({
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
    });
    // Any `cloudSync`, even false, turns iCloud sync on (see storage.ts).
    expect(item.options).not.toHaveProperty('cloudSync');
    expect(
      await Keychain.getGenericPassword({service: item.options.service}),
    ).toBeTruthy();
  });

  it('reopens existing files with the same key', async () => {
    const first = await openSecureStorage();
    await first.local.set('SERIALIZED', 'vault');

    const second = await openSecureStorage();
    expect(await second.local.get('SERIALIZED')).toBe('vault');
  });

  it('reports software-only storage when secure hardware is unavailable', async () => {
    keychain.__setHardwareAvailable(false);
    const {hardwareBacked} = await openSecureStorage();
    expect(hardwareBacked).toBe(false);
  });

  it('refuses to start over when the key of an existing install is missing', async () => {
    const first = await openSecureStorage();
    await first.local.set('SERIALIZED', 'vault');
    keychain.__reset();

    await expect(openSecureStorage()).rejects.toThrow(
      'missing from the keychain',
    );
    // No new key was made, so the files are untouched.
    expect(keychain.__items.size).toBe(0);
    expect(mockMmkvFiles.get('adena-local')?.values.get('SERIALIZED')).toBe(
      '"vault"',
    );
  });

  it('starts fresh after a reinstall that left the old key in the keychain', async () => {
    await openSecureStorage();
    // iOS keeps keychain items when an app is deleted; its files are gone.
    mockMmkvFiles.clear();

    const {local} = await openSecureStorage();
    expect(await local.get('SERIALIZED')).toBeUndefined();
  });

  it('stores the schema version and keeps it when the wallet is reset', async () => {
    const {local} = await openSecureStorage();
    const file = mockMmkvFiles.get('adena-local')!.values;
    expect(file.get(SCHEMA_VERSION_KEY)).toBe(String(CURRENT_SCHEMA_VERSION));

    await local.set('SERIALIZED', 'vault');
    await local.clear();
    expect(file.get(SCHEMA_VERSION_KEY)).toBe(String(CURRENT_SCHEMA_VERSION));
  });

  it('refuses to open storage written by a newer app', async () => {
    await openSecureStorage();
    mockMmkvFiles
      .get('adena-local')!
      .values.set(SCHEMA_VERSION_KEY, String(CURRENT_SCHEMA_VERSION + 1));
    await expect(openSecureStorage()).rejects.toThrow('newer app');
  });

  it('keeps the canary when the local storage is cleared', async () => {
    const {local} = await openSecureStorage();
    await local.set('SERIALIZED', 'vault');
    await local.clear();

    expect(await local.get('SERIALIZED')).toBeUndefined();
    await expect(openSecureStorage()).resolves.toBeDefined();
  });
});

it('reads the keys the extension seeds on install as empty objects', async () => {
  const {local} = await openSecureStorage();
  expect(await local.get('ACCOUNT_TOKEN_METAINFOS')).toEqual({});
  expect(await local.get('ACCOUNT_NAMES')).toEqual({});
  expect(await local.get('SERIALIZED')).toBeUndefined();
});

describe('MemoryStorage', () => {
  it('answers missing keys with an empty string like chrome.storage.session', async () => {
    const storage = new MemoryStorage();
    expect(await storage.get('ENCRYPTED_PASSWORD')).toBe('');
    await storage.set('ENCRYPTED_PASSWORD', 'x');
    await storage.clear();
    expect(await storage.get('ENCRYPTED_PASSWORD')).toBe('');
  });
});
