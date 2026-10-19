import type {Storage} from '@common/storage/storage';
import {getCryptoProvider, toBase64UrlNoPadding} from 'adena-module';
import * as Keychain from 'react-native-keychain';
import {MMKV} from 'react-native-mmkv';

import {getProtectedStorageDirectory} from '../security/native-security';
import {migrateStorage, SCHEMA_VERSION_KEY} from './storage-schema';

const STORAGE_KEY_SERVICE = 'adena.mobile.storage-key';
const CANARY_KEY = '__adena_canary__';
const CANARY_VALUE = 'adena-storage-v1';
// An unencrypted MMKV beside the wallet files. It holds one flag and no
// secrets: that encrypted storage was set up on this install.
const META_ID = 'adena-meta';
const META_INITIALIZED = 'storage-initialized';

// MMKV accepts at most 16 bytes of key. 12 random bytes encode to exactly 16
// base64url characters (96 bits). MMKV's cipher is a second layer: the wallet
// vault inside it is already sealed with Argon2id + XChaCha20-Poly1305.
const STORAGE_KEY_RANDOM_BYTES = 12;

export interface SecureStorageStatus {
  /** False when the platform could not keep the storage key in secure hardware. */
  hardwareBacked: boolean;
}

async function saveStorageKey(
  key: string,
  hardware: boolean,
): Promise<boolean> {
  // No `cloudSync` option: react-native-keychain 10 on iOS turns iCloud sync
  // ON whenever the option is present, even as `false`, and then cannot find
  // the item again. Left out, the item is not synchronizable, and
  // ...THIS_DEVICE_ONLY keeps it off backups and other devices.
  const result = await Keychain.setGenericPassword('adena', key, {
    service: STORAGE_KEY_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
    ...(hardware
      ? {securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE}
      : {}),
  });
  return result !== false;
}

async function loadOrCreateStorageKey(
  mayCreate: boolean,
): Promise<{key: string} & SecureStorageStatus> {
  const existing = await Keychain.getGenericPassword({
    service: STORAGE_KEY_SERVICE,
  });
  if (existing) {
    const level = await Keychain.getSecurityLevel();
    return {
      key: existing.password,
      hardwareBacked: level === Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
    };
  }
  if (!mayCreate) {
    // MMKV opened with a new key finds the old files unreadable and starts
    // them empty, which would silently drop the wallet. Stop here instead.
    throw new Error(
      'The storage key for this install is missing from the keychain',
    );
  }

  const key = toBase64UrlNoPadding(
    getCryptoProvider().randomBytes(STORAGE_KEY_RANDOM_BYTES),
  );
  if (await saveStorageKey(key, true).catch(() => false)) {
    return {key, hardwareBacked: true};
  }
  if (await saveStorageKey(key, false)) {
    return {key, hardwareBacked: false};
  }
  throw new Error('Could not store the storage key in the keychain');
}

/**
 * Object values the extension's storage migration writes on install. Its
 * repositories read these keys without a null check (e.g. the token list does
 * `stored[accountId]`), and mobile runs no migration, so a missing key reads
 * as the same empty object instead of undefined.
 */
const INSTALL_DEFAULTS: Record<string, () => unknown> = {
  ACCOUNT_NAMES: () => ({}),
  ESTABLISH_SITES: () => ({}),
  ACCOUNT_TOKEN_METAINFOS: () => ({}),
  ACCOUNT_GRC721_COLLECTIONS: () => ({}),
  ACCOUNT_GRC721_PINNED_PACKAGES: () => ({}),
  SESSIONS: () => ({}),
};

/** `Storage` (from the extension) on top of an encrypted MMKV instance. */
export class MmkvStorage implements Storage {
  constructor(private readonly mmkv: MMKV) {}

  get = async (key: string): Promise<any> => {
    const raw = this.mmkv.getString(key);
    return raw === undefined ? INSTALL_DEFAULTS[key]?.() : JSON.parse(raw);
  };

  set = async (key: string, value: any): Promise<void> => {
    this.mmkv.set(key, JSON.stringify(value));
  };

  remove = async (key: string): Promise<void> => {
    this.mmkv.delete(key);
  };

  // The canary and the schema version describe the file, not the wallet.
  clear = async (): Promise<void> => {
    for (const key of this.mmkv.getAllKeys()) {
      if (key !== CANARY_KEY && key !== SCHEMA_VERSION_KEY) {
        this.mmkv.delete(key);
      }
    }
  };
}

/** Session values (the encrypted session password); never written to disk. */
export class MemoryStorage implements Storage {
  private readonly values = new Map<string, any>();

  get = async (key: string): Promise<any> => this.values.get(key) ?? '';

  set = async (key: string, value: any): Promise<void> => {
    this.values.set(key, value);
  };

  remove = async (key: string): Promise<void> => {
    this.values.delete(key);
  };

  clear = async (): Promise<void> => {
    this.values.clear();
  };
}

export interface OpenedStorage extends SecureStorageStatus {
  local: MmkvStorage;
  cache: MmkvStorage;
}

/**
 * Opens the wallet's persistent storage: MMKV files in a backup-excluded
 * directory, encrypted with a key that lives only in this device's
 * Keychain/Keystore. Refuses to continue, instead of reading garbage or
 * starting the files over, when the key of an existing install is missing or
 * the files were written with a different key.
 */
export async function openSecureStorage(): Promise<OpenedStorage> {
  const path = await getProtectedStorageDirectory();
  const meta = new MMKV({id: META_ID, path});
  const {key, hardwareBacked} = await loadOrCreateStorageKey(
    !meta.getBoolean(META_INITIALIZED),
  );

  const open = (id: string): MMKV => {
    const mmkv = new MMKV({id, path, encryptionKey: key});
    const canary = mmkv.getString(CANARY_KEY);
    if (canary === undefined && mmkv.getAllKeys().length === 0) {
      mmkv.set(CANARY_KEY, CANARY_VALUE);
    } else if (canary !== CANARY_VALUE) {
      throw new Error(
        `Storage "${id}" cannot be decrypted with this device's key`,
      );
    }
    return mmkv;
  };

  const local = open('adena-local');
  const cache = open('adena-cache');
  migrateStorage({local, cache}, [CANARY_KEY]);
  const opened = {
    local: new MmkvStorage(local),
    cache: new MmkvStorage(cache),
    hardwareBacked,
  };
  meta.set(META_INITIALIZED, true);
  return opened;
}
