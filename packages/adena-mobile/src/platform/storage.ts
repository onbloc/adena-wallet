import type {Storage} from '@common/storage/storage';
import {getCryptoProvider, toBase64UrlNoPadding} from 'adena-module';
import * as Keychain from 'react-native-keychain';
import {MMKV} from 'react-native-mmkv';

import {getProtectedStorageDirectory} from '../security/native-security';

const STORAGE_KEY_SERVICE = 'adena.mobile.storage-key';
const CANARY_KEY = '__adena_canary__';
const CANARY_VALUE = 'adena-storage-v1';

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
  const result = await Keychain.setGenericPassword('adena', key, {
    service: STORAGE_KEY_SERVICE,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
    cloudSync: false,
    ...(hardware
      ? {securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE}
      : {}),
  });
  return result !== false;
}

async function loadOrCreateStorageKey(): Promise<
  {key: string} & SecureStorageStatus
> {
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

/** `Storage` (from the extension) on top of an encrypted MMKV instance. */
export class MmkvStorage implements Storage {
  constructor(private readonly mmkv: MMKV) {}

  get = async (key: string): Promise<any> => {
    const raw = this.mmkv.getString(key);
    return raw === undefined ? undefined : JSON.parse(raw);
  };

  set = async (key: string, value: any): Promise<void> => {
    this.mmkv.set(key, JSON.stringify(value));
  };

  remove = async (key: string): Promise<void> => {
    this.mmkv.delete(key);
  };

  clear = async (): Promise<void> => {
    for (const key of this.mmkv.getAllKeys()) {
      if (key !== CANARY_KEY) {
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
 * Keychain/Keystore. Refuses to continue if the files were written with a
 * different key, instead of reading garbage or overwriting them.
 */
export async function openSecureStorage(): Promise<OpenedStorage> {
  const {key, hardwareBacked} = await loadOrCreateStorageKey();
  const path = await getProtectedStorageDirectory();

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

  return {
    local: new MmkvStorage(open('adena-local')),
    cache: new MmkvStorage(open('adena-cache')),
    hardwareBacked,
  };
}
