import { StorageModelDataV028 } from '../v028/storage-model-v028';

// v029 does not change the storage shape; it only replaces the staging testnet with onyx-1.
export type StorageModelDataV029 = StorageModelDataV028;

export type StorageModelV029 = {
  version: 29;
  data: StorageModelDataV029;
};
