import { StorageModelDataV027 } from '../v027/storage-model-v027';

// v028 does not change the storage shape; it only swaps the gnoland-1 primary and fallback RPCs.
export type StorageModelDataV028 = StorageModelDataV027;

export type StorageModelV028 = {
  version: 28;
  data: StorageModelDataV028;
};
