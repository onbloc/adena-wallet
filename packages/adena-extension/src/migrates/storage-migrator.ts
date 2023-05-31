import { StorageModel } from '@common/storage';
import { Migration, Migrator } from './migrator';
import { StorageModelV002 } from './migrations/v002/storage-model-v002';
import { StorageModelDataV001, StorageModelV001 } from './migrations/v001/storage-model-v001';
import { StorageMigration002 } from './migrations/v002/storage-migration-v002';

const LegacyStorageKeys = [
  'NETWORKS',
  'CURRENT_CHAIN_ID',
  'CURRENT_NETWORK_ID',
  'SERIALIZED',
  'ENCRYPTED_STORED_PASSWORD',
  'CURRENT_ACCOUNT_ID',
  'ACCOUNT_NAMES',
  'ESTABLISH_SITES',
  'ADDRSS_BOOK',
  'SERIALIZED',
  'ACCOUNT_TOKEN_METAINFOS',
];

export type StorageModelLatest = StorageModelV002;

const defaultData: StorageModelDataV001 = {
  ACCOUNT_NAMES: {},
  ADDRSS_BOOK: {},
  CURRENT_ACCOUNT_ID: '',
  CURRENT_CHAIN_ID: '',
  CURRENT_NETWORK_ID: '',
  ESTABLISH_SITES: {},
  NETWORKS: [],
  ENCRYPTED_STORED_PASSWORD: '',
  SERIALIZED: '',
  ACCOUNT_TOKEN_METAINFOS: {},
};

interface Storage {
  set(items: { [key: string]: any }): Promise<void>;
  get(keys?: string | string[] | { [key: string]: any } | null): Promise<{ [key: string]: any }>;
}

export class StorageMigrator implements Migrator {
  private static StorageKey = 'ADENA_DATA';
  constructor(
    private migrations: Migration[],
    private storage: Storage,
    private password?: string,
  ) {}

  setPassword(passowrd: string) {
    this.password = passowrd;
  }

  async saveable() {
    const current = await this.getCurrent();
    const latestVersion = Math.max(...this.migrations.map((m) => m.version));
    if (current.version === latestVersion) {
      return true;
    }
    return this.password && this.password.length > 0;
  }

  async serialize(data: StorageModel<unknown>) {
    return JSON.stringify(data);
  }

  async deserialize(data: string) {
    try {
      return this.mappedJson(JSON.parse(data));
    } catch (e) {
      console.error('Migrate', e);
    }
    return null;
  }

  async getCurrent() {
    const storedValues = await this.storage.get(StorageMigrator.StorageKey);
    const data = await this.deserialize(storedValues[StorageMigrator.StorageKey]);
    if (data) {
      return data;
    }
    return {
      version: 1,
      data: defaultData,
    };
  }

  async migrate(current: StorageModel) {
    let latest = current;
    try {
      const currentVersion = current.version || 1;
      const migrations = this.migrations
        .sort((a, b) => a.version - b.version)
        .filter((migration) => migration.version > currentVersion);

      for (const migration of migrations) {
        latest = await migration.up(latest, this.password);
      }
    } catch (error) {
      console.error(error);
      await this.backup(current);
      return null;
    }
    return latest as StorageModelLatest;
  }

  async save(latest: StorageModel) {
    if (!(await this.saveable())) {
      throw new Error('Unable to save');
    }
    const savedData = await this.serialize(latest);
    await this.storage.set({
      [StorageMigrator.StorageKey]: savedData,
    });
  }

  private async backup(current: StorageModel) {
    const backupStorageKey = `${StorageMigrator.StorageKey}_${Date.now()}`;
    const savedData = await this.serialize(current);
    await this.storage.set({ [backupStorageKey]: savedData });
  }

  private async mappedJson(json: any) {
    if (json?.version === 2) {
      return json as StorageModelV002;
    }
    if (json?.version === 1) {
      return json as StorageModelV001;
    }

    let data = defaultData;
    const isLegacy = await this.storage.get('SERIALIZED');
    if (isLegacy) {
      data = await this.getLegacyData();
    }

    return {
      version: 1,
      data,
    } as StorageModelV001;
  }

  private async getLegacyData() {
    const legacyData: { [key in string]: unknown } = {};
    for (const key of LegacyStorageKeys) {
      legacyData[key] = (await this.storage.get(key))[key];
    }
    return legacyData as StorageModelDataV001;
  }

  static migrations(): Migration[] {
    return [new StorageMigration002()];
  }
}
