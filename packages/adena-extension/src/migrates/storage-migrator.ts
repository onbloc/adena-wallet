import { StorageModel } from '@common/storage';
import { StorageModelDataV001, StorageModelV001 } from './migrations/v001/storage-model-v001';
import { StorageMigration002 } from './migrations/v002/storage-migration-v002';
import { StorageModelV002 } from './migrations/v002/storage-model-v002';
import { StorageMigration003 } from './migrations/v003/storage-migration-v003';
import { StorageModelV003 } from './migrations/v003/storage-model-v003';
import { StorageMigration004 } from './migrations/v004/storage-migration-v004';
import { StorageModelV004 } from './migrations/v004/storage-model-v004';
import { StorageMigration005 } from './migrations/v005/storage-migration-v005';
import { StorageModelV005 } from './migrations/v005/storage-model-v005';
import { StorageMigration006 } from './migrations/v006/storage-migration-v006';
import { StorageModelV006 } from './migrations/v006/storage-model-v006';
import { StorageMigration007 } from './migrations/v007/storage-migration-v007';
import { StorageModelV007 } from './migrations/v007/storage-model-v007';
import { Migration, Migrator } from './migrator';

const LegacyStorageKeys = [
  'NETWORKS',
  'CURRENT_CHAIN_ID',
  'CURRENT_NETWORK_ID',
  'SERIALIZED',
  'ENCRYPTED_STORED_PASSWORD',
  'CURRENT_ACCOUNT_ID',
  'ACCOUNT_NAMES',
  'ESTABLISH_SITES',
  'ADDRESS_BOOK',
  'ACCOUNT_TOKEN_METAINFOS',
];

export type StorageModelLatest = StorageModelV007;

const defaultData: StorageModelDataV001 = {
  ACCOUNT_NAMES: {},
  ADDRESS_BOOK: {},
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

  setPassword(password: string): void {
    this.password = password;
  }

  async saveable(): Promise<boolean | '' | undefined> {
    const current = await this.getCurrent();
    const latestVersion = Math.max(...this.migrations.map((m) => m.version));
    if (current.data.SERIALIZED === '') {
      return false;
    }
    if (current.version !== latestVersion) {
      return false;
    }
    return this.password && this.password.length > 0;
  }

  async serialize(data: StorageModel<unknown>): Promise<string> {
    return JSON.stringify(data);
  }

  async deserialize(
    data: string | undefined,
  ): Promise<
    | StorageModelV007
    | StorageModelV006
    | StorageModelV005
    | StorageModelV004
    | StorageModelV003
    | StorageModelV002
    | StorageModelV001
  > {
    let jsonData = null;
    if (data) {
      try {
        jsonData = JSON.parse(data);
      } catch (e) {
        console.error('Migrate', e);
      }
    }
    return this.mappedJson(jsonData);
  }

  async getCurrent(): Promise<
    | StorageModelV007
    | StorageModelV006
    | StorageModelV005
    | StorageModelV004
    | StorageModelV003
    | StorageModelV002
    | { version: number; data: StorageModelDataV001 }
  > {
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

  async migrate(current: StorageModel): Promise<StorageModelV007 | null> {
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

  async save(latest: StorageModel): Promise<void> {
    if (!(await this.saveable())) {
      throw new Error('Unable to save');
    }
    const savedData = await this.serialize(latest);
    await this.storage.set({
      [StorageMigrator.StorageKey]: savedData,
    });
  }

  private async backup(current: StorageModel): Promise<void> {
    const backupStorageKey = `${StorageMigrator.StorageKey}_${Date.now()}`;
    const savedData = await this.serialize(current);
    await this.storage.set({ [backupStorageKey]: savedData });
  }

  private async mappedJson(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    json: any,
  ): Promise<
    | StorageModelV007
    | StorageModelV006
    | StorageModelV005
    | StorageModelV004
    | StorageModelV003
    | StorageModelV002
    | StorageModelV001
  > {
    if (json?.version === 7) {
      return json as StorageModelV007;
    }
    if (json?.version === 6) {
      return json as StorageModelV006;
    }
    if (json?.version === 5) {
      return json as StorageModelV005;
    }
    if (json?.version === 4) {
      return json as StorageModelV004;
    }
    if (json?.version === 3) {
      return json as StorageModelV003;
    }
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

  private async getLegacyData(): Promise<StorageModelDataV001> {
    const legacyData: { [key in string]: unknown } = defaultData;
    for (const key of LegacyStorageKeys) {
      const data = (await this.storage.get(key))[key];
      if (data) {
        legacyData[key] = typeof legacyData[key] === 'object' ? JSON.parse(data) : data;
      }
    }
    return legacyData as StorageModelDataV001;
  }

  static migrations(): Migration[] {
    return [
      new StorageMigration002(),
      new StorageMigration003(),
      new StorageMigration004(),
      new StorageMigration005(),
      new StorageMigration006(),
      new StorageMigration007(),
    ];
  }
}
