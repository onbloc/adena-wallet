import { NetworksModelV022 } from '../v022/storage-model-v022';
import { StorageModelDataV026 } from '../v026/storage-model-v026';

// v027 adds the optional bundled `fallbackRPCUrl` to network entries so an
// existing default mainnet can fail over the same way a fresh install does.
export type NetworkModelV027 = NetworksModelV022[number] & { fallbackRPCUrl?: string };

export type NetworksModelV027 = NetworkModelV027[];

export type StorageModelDataV027 = Omit<StorageModelDataV026, 'NETWORKS'> & {
  NETWORKS: NetworksModelV027;
};

export type StorageModelV027 = {
  version: 27;
  data: StorageModelDataV027;
};
