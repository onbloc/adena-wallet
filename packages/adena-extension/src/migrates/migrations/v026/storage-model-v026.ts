import { StorageModelDataV025 } from '../v025/storage-model-v025';

// v026 does not change the storage shape — it only removes the pearl-1 testnet
// and the gnoland1 beta mainnet in favour of the gnoland-1 mainnet. The data
// model is therefore structurally identical to v025.
export type StorageModelDataV026 = StorageModelDataV025;

export type StorageModelV026 = {
  version: 26;
  data: StorageModelDataV026;
};
