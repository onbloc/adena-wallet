import {
  StorageModel,
} from '@common/storage'
import {
  Migration,
} from '@migrates/migrator'
import CHAIN_DATA from '@resources/chains/chains.json'

import {
  CurrentChainIdModelV016,
  CurrentNetworkIdModelV016,
  NetworksModelV016,
  StorageModelDataV016,
} from '../v016/storage-model-v016'
import {
  CurrentChainIdModelV017,
  CurrentNetworkIdModelV017,
  NetworksModelV017,
  StorageModelDataV017,
} from './storage-model-v017'

export class StorageMigration017 implements Migration<StorageModelDataV017> {
  public readonly version = 17

  async up(
    current: StorageModel<StorageModelDataV016>,
  ): Promise<StorageModel<StorageModelDataV017>> {
    if (!this.validateModelV016(current.data)) {
      throw new Error('Storage Data does not match version V016')
    }
    const previous: StorageModelDataV016 = current.data
    return {
      version: this.version,
      data: {
        ...previous,
        CURRENT_CHAIN_ID: this.migrateCurrentChainId(previous.CURRENT_CHAIN_ID),
        CURRENT_NETWORK_ID: this.migrateCurrentNetworkId(previous.CURRENT_NETWORK_ID),
        NETWORKS: this.migrateNetwork(previous.NETWORKS),
      },
    }
  }

  private validateModelV016(currentData: StorageModelDataV016): boolean {
    const storageDataKeys = ['NETWORKS', 'CURRENT_CHAIN_ID', 'CURRENT_NETWORK_ID', 'SERIALIZED', 'ENCRYPTED_STORED_PASSWORD', 'CURRENT_ACCOUNT_ID', 'ESTABLISH_SITES', 'ADDRESS_BOOK', 'ACCOUNT_TOKEN_METAINFOS', 'ACCOUNT_GRC721_COLLECTIONS', 'ACCOUNT_GRC721_PINNED_PACKAGES']
    const currentDataKeys = Object.keys(currentData)
    const hasKeys = storageDataKeys.every((dataKey) => {
      return currentDataKeys.includes(dataKey)
    })

    if (!hasKeys) {
      return false
    }
    if (!Array.isArray(currentData.NETWORKS)) {
      return false
    }
    if (typeof currentData.CURRENT_CHAIN_ID !== 'string') {
      return false
    }
    if (typeof currentData.CURRENT_NETWORK_ID !== 'string') {
      return false
    }
    if (typeof currentData.SERIALIZED !== 'string') {
      return false
    }
    if (typeof currentData.ENCRYPTED_STORED_PASSWORD !== 'string') {
      return false
    }
    if (typeof currentData.CURRENT_ACCOUNT_ID !== 'string') {
      return false
    }
    if (currentData.ACCOUNT_NAMES && typeof currentData.ACCOUNT_NAMES !== 'object') {
      return false
    }
    if (currentData.ESTABLISH_SITES && typeof currentData.ESTABLISH_SITES !== 'object') {
      return false
    }
    return true
  }

  private migrateCurrentChainId(currentChainId: CurrentChainIdModelV016): CurrentChainIdModelV017 {
    if (currentChainId === 'test11') {
      return 'gnoland1'
    }
    return currentChainId
  }

  private migrateCurrentNetworkId(
    currentNetworkId: CurrentNetworkIdModelV016,
  ): CurrentNetworkIdModelV017 {
    if (currentNetworkId === 'test11') {
      return 'gnoland1'
    }
    return currentNetworkId
  }

  private migrateNetwork(networks: NetworksModelV016): NetworksModelV017 {
    const defaultNetworks = CHAIN_DATA.filter(network => network.default)
    const customNetworks = networks
      .filter(network => !network.default)
      .map((network) => {
        const providedNetwork = CHAIN_DATA.find(data => data.chainId === network.id)
        if (providedNetwork) {
          return {
            ...providedNetwork,
            chainName: network.chainName,
            networkName: network.networkName,
            rpcUrl: network.rpcUrl,
          }
        }
        return {
          ...network,
          indexerUrl: '',
        }
      })
    return [...defaultNetworks, ...customNetworks]
  }
}
