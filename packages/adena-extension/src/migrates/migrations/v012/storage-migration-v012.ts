import { StorageModel } from '@common/storage';
import { Migration } from '@migrates/migrator';
import CHAIN_DATA from '@resources/chains/chains.json';
import {
  CurrentChainIdModelV011,
  CurrentNetworkIdModelV011,
  NetworksModelV011,
  StorageModelDataV011,
} from '../v011/storage-model-v011';
import {
  CurrentChainIdModelV012,
  CurrentNetworkIdModelV012,
  NetworksModelV012,
  StorageModelDataV012,
} from './storage-model-v012';

export class StorageMigration012 implements Migration<StorageModelDataV012> {
  public readonly version = 12;

  async up(
    current: StorageModel<StorageModelDataV011>,
  ): Promise<StorageModel<StorageModelDataV012>> {
    if (!this.validateModelV011(current.data)) {
      throw new Error('Storage Data does not match version V011');
    }
    const previous: StorageModelDataV011 = current.data;
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

  private validateModelV011(currentData: StorageModelDataV011): boolean {
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

  private migrateCurrentChainId(currentChainId: CurrentChainIdModelV011): CurrentChainIdModelV012 {
    if (currentChainId === 'test7.2') {
      return 'test8';
    }
    return currentChainId;
  }

  private migrateCurrentNetworkId(
    currentNetworkId: CurrentNetworkIdModelV011,
  ): CurrentNetworkIdModelV012 {
    if (currentNetworkId === 'test7.2') {
      return 'test8';
    }
    return currentNetworkId;
  }

  private migrateNetwork(networks: NetworksModelV011): NetworksModelV012 {
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
