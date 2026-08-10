import { StorageModelDataV023 } from '../v023/storage-model-v023';

// v024 does not change the storage shape — it only replaces the topaz-1 testnet
// with sapphire-1. The data model is therefore structurally identical to v023.
export type StorageModelDataV024 = StorageModelDataV023;

export type StorageModelV024 = {
  version: 24;
  data: StorageModelDataV024;
};
