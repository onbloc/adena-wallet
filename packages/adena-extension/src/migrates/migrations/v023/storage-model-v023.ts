import { StorageModelDataV022 } from '../v022/storage-model-v022';

// v023 does not change the storage shape — it only re-keys GRC20 token ids to
// the token key `{packagePath}.{symbol}`. The data model is therefore
// structurally identical to v022.
export type StorageModelDataV023 = StorageModelDataV022;

export type StorageModelV023 = {
  version: 23;
  data: StorageModelDataV023;
};
