import { Migration } from '@migrates/migrator';
import { StorageModel } from '@common/storage';
import {
  CurrentChainIdModelV005,
  CurrentNetworkIdModelV005,
  NetworksModelV005,
  StorageModelDataV005,
} from '../v005/storage-model-v005';
import {
  CurrentChainIdModelV006,
  CurrentNetworkIdModelV006,
  NetworksModelV006,
  StorageModelDataV006,
} from './storage-model-v006';
import CHAIN_DATA from '@resources/chains/chains.json';

export class StorageMigration006 implements Migration<StorageModelDataV006> {
  public readonly version = 6;

  async up(
    current: StorageModel<StorageModelDataV005>,
  ): Promise<StorageModel<StorageModelDataV006>> {
    if (!this.validateModelV005(current.data)) {
      throw new Error('Storage Data does not match version V005');
    }
    const previous: StorageModelDataV005 = current.data;
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

  private validateModelV005(currentData: StorageModelDataV005): boolean {
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

  private migrateCurrentChainId(currentChainId: CurrentChainIdModelV005): CurrentChainIdModelV006 {
    if (currentChainId === 'test3') {
      return 'test4';
    }
    return currentChainId;
  }

  private migrateCurrentNetworkId(
    currentNetworkId: CurrentNetworkIdModelV005,
  ): CurrentNetworkIdModelV006 {
    if (currentNetworkId === 'test3') {
      return 'test4';
    }
    return currentNetworkId;
  }

  private migrateNetwork(networks: NetworksModelV005): NetworksModelV006 {
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
