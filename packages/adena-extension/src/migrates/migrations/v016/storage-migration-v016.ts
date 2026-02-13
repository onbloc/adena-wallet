import { StorageModel } from '@common/storage';
import { Migration } from '@migrates/migrator';
import CHAIN_DATA from '@resources/chains/chains.json';
import {
  CurrentChainIdModelV015,
  CurrentNetworkIdModelV015,
  NetworksModelV015,
  StorageModelDataV015,
} from '../v015/storage-model-v015';
import {
  CurrentChainIdModelV016,
  CurrentNetworkIdModelV016,
  NetworksModelV016,
  StorageModelDataV016,
} from './storage-model-v016';

export class StorageMigration016 implements Migration<StorageModelDataV016> {
  public readonly version = 16;

  async up(
    current: StorageModel<StorageModelDataV015>,
  ): Promise<StorageModel<StorageModelDataV016>> {
    if (!this.validateModelV015(current.data)) {
      throw new Error('Storage Data does not match version V015');
    }
    const previous: StorageModelDataV015 = current.data;
    return {
      version: this.version,
      data: {
        ...previous,
        CURRENT_CHAIN_ID: this.migrateCurrentChainId(previous.CURRENT_CHAIN_ID),
        CURRENT_NETWORK_ID: this.migrateCurrentNetworkId(previous.CURRENT_NETWORK_ID),
        NETWORKS: this.migrateNetwork(previous.NETWORKS),
      },
    };
  }

  private validateModelV015(currentData: StorageModelDataV015): boolean {
    const storageDataKeys = [
      'NETWORKS',
      'CURRENT_CHAIN_ID',
      'CURRENT_NETWORK_ID',
      'SERIALIZED',
      'ENCRYPTED_STORED_PASSWORD',
      'CURRENT_ACCOUNT_ID',
      'ESTABLISH_SITES',
      'ADDRESS_BOOK',
      'ACCOUNT_TOKEN_METAINFOS',
      'ACCOUNT_GRC721_COLLECTIONS',
      'ACCOUNT_GRC721_PINNED_PACKAGES',
    ];
    const currentDataKeys = Object.keys(currentData);
    const hasKeys = storageDataKeys.every((dataKey) => {
      return currentDataKeys.includes(dataKey);
    });

    if (!hasKeys) {
      return false;
    }
    if (!Array.isArray(currentData.NETWORKS)) {
      return false;
    }
    if (typeof currentData.CURRENT_CHAIN_ID !== 'string') {
      return false;
    }
    if (typeof currentData.CURRENT_NETWORK_ID !== 'string') {
      return false;
    }
    if (typeof currentData.SERIALIZED !== 'string') {
      return false;
    }
    if (typeof currentData.ENCRYPTED_STORED_PASSWORD !== 'string') {
      return false;
    }
    if (typeof currentData.CURRENT_ACCOUNT_ID !== 'string') {
      return false;
    }
    if (currentData.ACCOUNT_NAMES && typeof currentData.ACCOUNT_NAMES !== 'object') {
      return false;
    }
    if (currentData.ESTABLISH_SITES && typeof currentData.ESTABLISH_SITES !== 'object') {
      return false;
    }
    return true;
  }

  private migrateCurrentChainId(currentChainId: CurrentChainIdModelV015): CurrentChainIdModelV016 {
    if (currentChainId === 'test10') {
      return 'test11';
    }
    return currentChainId;
  }

  private migrateCurrentNetworkId(
    currentNetworkId: CurrentNetworkIdModelV015,
  ): CurrentNetworkIdModelV016 {
    if (currentNetworkId === 'test10') {
      return 'test11';
    }
    return currentNetworkId;
  }

  private migrateNetwork(networks: NetworksModelV015): NetworksModelV016 {
    const defaultNetworks = CHAIN_DATA.filter((network) => network.default);
    const customNetworks = networks
      .filter((network) => !network.default)
      .map((network) => {
        const providedNetwork = CHAIN_DATA.find((data) => data.chainId === network.id);
        if (providedNetwork) {
          return {
            ...providedNetwork,
            chainName: network.chainName,
            networkName: network.networkName,
            rpcUrl: network.rpcUrl,
          };
        }
        return {
          ...network,
          indexerUrl: '',
        };
      });
    return [...defaultNetworks, ...customNetworks];
  }
}
