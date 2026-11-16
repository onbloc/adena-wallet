import { StorageModelDataV024 } from '../v024/storage-model-v024';

// v025 does not change the storage shape — it only replaces the sapphire-1
// testnet with pearl-1. The data model is therefore structurally identical to
// v024.
export type StorageModelDataV025 = StorageModelDataV024;

export type StorageModelV025 = {
  version: 25;
  data: StorageModelDataV025;
};
