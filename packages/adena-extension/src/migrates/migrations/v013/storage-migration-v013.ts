import { StorageModel } from '@common/storage';
import { Migration } from '@migrates/migrator';
import CHAIN_DATA from '@resources/chains/chains.json';
import {
  CurrentChainIdModelV012,
  CurrentNetworkIdModelV012,
  NetworksModelV012,
  StorageModelDataV012,
} from '../v012/storage-model-v012';
import {
  CurrentChainIdModelV013,
  CurrentNetworkIdModelV013,
  NetworksModelV013,
  StorageModelDataV013,
} from './storage-model-v013';

export class StorageMigration013 implements Migration<StorageModelDataV013> {
  public readonly version = 13;

  async up(
    current: StorageModel<StorageModelDataV012>,
  ): Promise<StorageModel<StorageModelDataV013>> {
    if (!this.validateModelV012(current.data)) {
      throw new Error('Storage Data does not match version V012');
    }
    const previous: StorageModelDataV012 = current.data;
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

  private validateModelV012(currentData: StorageModelDataV012): boolean {
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

  private migrateCurrentChainId(currentChainId: CurrentChainIdModelV012): CurrentChainIdModelV013 {
    if (currentChainId === 'test8') {
      return 'test9';
    }
    return currentChainId;
  }

  private migrateCurrentNetworkId(
    currentNetworkId: CurrentNetworkIdModelV012,
  ): CurrentNetworkIdModelV013 {
    if (currentNetworkId === 'test8') {
      return 'test9';
    }
    return currentNetworkId;
  }

  private migrateNetwork(networks: NetworksModelV012): NetworksModelV013 {
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
