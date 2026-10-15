import * as Keychain from 'react-native-keychain';

const mockMmkvFiles = new Map<
  string,
  {key?: string; values: Map<string, string>}
>();

jest.mock('react-native-mmkv', () => ({
  MMKV: class {
    private readonly file: {key?: string; values: Map<string, string>};

    private readonly readable: boolean;

    constructor({id, encryptionKey}: {id: string; encryptionKey?: string}) {
      if (!mockMmkvFiles.has(id)) {
        mockMmkvFiles.set(id, {key: encryptionKey, values: new Map()});
      }
      this.file = mockMmkvFiles.get(id)!;
      // A different key decrypts to garbage: model it as unreadable values.
      this.readable = this.file.key === encryptionKey;
    }

    getString(key: string) {
      const value = this.file.values.get(key);
      return value === undefined || this.readable ? value : '\u0000garbage';
    }

    set(key: string, value: string) {
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
  it('creates a device-only, non-syncing storage key and round-trips JSON values', async () => {
    const {local, hardwareBacked} = await openSecureStorage();
    await local.set('NETWORKS', [{id: 'test12'}]);

    expect(await local.get('NETWORKS')).toEqual([{id: 'test12'}]);
    expect(hardwareBacked).toBe(true);

    const [item] = [...keychain.__items.values()];
    expect(item.password).toHaveLength(16);
    expect(item.options).toMatchObject({
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      cloudSync: false,
      securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
    });
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

  it('refuses files written with another key instead of overwriting them', async () => {
    await openSecureStorage();
    keychain.__reset();

    await expect(openSecureStorage()).rejects.toThrow('cannot be decrypted');
  });

  it('keeps the canary when the local storage is cleared', async () => {
    const {local} = await openSecureStorage();
    await local.set('SERIALIZED', 'vault');
    await local.clear();

    expect(await local.get('SERIALIZED')).toBeUndefined();
    await expect(openSecureStorage()).resolves.toBeDefined();
  });
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
