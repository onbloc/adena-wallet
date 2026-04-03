import { StorageModel } from '@common/storage';

export interface Migration<R = any> {
  version: number;
  up: (current: StorageModel, password?: string) => Promise<StorageModel<R>>;
}

export interface Migrator {
  getCurrent: () => Promise<StorageModel>;
  migrate: (current: StorageModel, password: string) => Promise<StorageModel | null>;
  save: (result: StorageModel) => Promise<void>;
}
