import { StorageModel } from '@common/storage';
import { Migration } from '@migrates/migrator';
import CHAIN_DATA from '@resources/chains/chains.json';
import { StorageModelDataV021 } from '../v021/storage-model-v021';
import {
  AccountGRC721CollectionsV022,
  AccountGRC721PinnedPackagesV022,
  AccountTokenMetainfoModelV022,
  EstablishSitesModelV022,
  NetworksModelV022,
  SessionsModelV022,
  StorageModelDataV022,
} from './storage-model-v022';

const OLD_CHAIN_ID = 'test-13';
const NEW_CHAIN_ID = 'topaz-1';

export class StorageMigration022 implements Migration<StorageModelDataV022> {
  public readonly version = 22;

  async up(
    current: StorageModel<StorageModelDataV021>,
  ): Promise<StorageModel<StorageModelDataV022>> {
    if (!this.validateModelV021(current.data)) {
      throw new Error('Storage Data does not match version V021');
    }
    const previous: StorageModelDataV021 = current.data;

    return {
      version: this.version,
      data: {
        ...previous,
        CURRENT_CHAIN_ID: this.migrateChainId(previous.CURRENT_CHAIN_ID),
        CURRENT_NETWORK_ID: this.migrateChainId(previous.CURRENT_NETWORK_ID),
        NETWORKS: this.migrateNetworks(previous.NETWORKS),
        ESTABLISH_SITES: this.removeOldChainEstablishSites(previous.ESTABLISH_SITES),
        ACCOUNT_TOKEN_METAINFOS: this.removeOldChainTokenMetainfos(
          previous.ACCOUNT_TOKEN_METAINFOS,
        ),
        SESSIONS: this.removeOldChainSessions(previous.SESSIONS),
        ACCOUNT_GRC721_COLLECTIONS: this.migrateGrc721Collections(
          previous.ACCOUNT_GRC721_COLLECTIONS,
        ),
        ACCOUNT_GRC721_PINNED_PACKAGES: this.migrateGrc721PinnedPackages(
          previous.ACCOUNT_GRC721_PINNED_PACKAGES,
        ),
      },
    };
  }

  private validateModelV021(currentData: StorageModelDataV021): boolean {
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
      'KDF_SALT',
      'SESSIONS',
    ];
    const currentDataKeys = Object.keys(currentData);
    const hasKeys = storageDataKeys.every((key) => currentDataKeys.includes(key));
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
    if (currentData.SESSIONS && typeof currentData.SESSIONS !== 'object') {
      return false;
    }
    return true;
  }

  private isOldChainId(id: string): boolean {
    return id === OLD_CHAIN_ID;
  }

  private migrateChainId(id: string): string {
    return id === OLD_CHAIN_ID ? NEW_CHAIN_ID : id;
  }

  private migrateNetworks(networks: StorageModelDataV021['NETWORKS']): NetworksModelV022 {
    const defaultNetworks = CHAIN_DATA.filter((n) => n.default);
    const customNetworks = networks
      .filter((n) => !n.default && !this.isOldChainId(n.chainId))
      .map((n) => {
        const provided = CHAIN_DATA.find((d) => d.chainId === n.chainId || d.id === n.id);
        if (provided) {
          return {
            ...provided,
            chainName: n.chainName,
            networkName: n.networkName,
            rpcUrl: n.rpcUrl,
          };
        }
        return {
          ...n,
          indexerUrl: n.indexerUrl || '',
        };
      });
    return [...defaultNetworks, ...customNetworks];
  }

  private removeOldChainEstablishSites(
    sites: StorageModelDataV021['ESTABLISH_SITES'],
  ): EstablishSitesModelV022 {
    const result: EstablishSitesModelV022 = {};
    for (const accountId of Object.keys(sites)) {
      const filtered = sites[accountId].filter((site) => !this.isOldChainId(site.chainId));
      if (filtered.length > 0) {
        result[accountId] = filtered;
      }
    }
    return result;
  }

  private removeOldChainTokenMetainfos(
    metainfos: StorageModelDataV021['ACCOUNT_TOKEN_METAINFOS'],
  ): AccountTokenMetainfoModelV022 {
    const result: AccountTokenMetainfoModelV022 = {};
    for (const accountId of Object.keys(metainfos)) {
      const filtered = metainfos[accountId].filter((token) => !this.isOldChainId(token.networkId));
      if (filtered.length > 0) {
        result[accountId] = filtered;
      }
    }
    return result;
  }

  private removeOldChainSessions(sessions: StorageModelDataV021['SESSIONS']): SessionsModelV022 {
    const result: SessionsModelV022 = {};
    for (const sessionAddr of Object.keys(sessions)) {
      if (!this.isOldChainId(sessions[sessionAddr].chainId)) {
        result[sessionAddr] = sessions[sessionAddr];
      }
    }
    return result;
  }

  private migrateGrc721Collections(
    collections: StorageModelDataV021['ACCOUNT_GRC721_COLLECTIONS'],
  ): AccountGRC721CollectionsV022 {
    const result: AccountGRC721CollectionsV022 = {};
    for (const accountId of Object.keys(collections)) {
      const networks = Object.keys(collections[accountId]).filter(
        (networkId) => !this.isOldChainId(networkId),
      );
      if (networks.length === 0) {
        continue;
      }
      result[accountId] = {};
      for (const networkId of networks) {
        result[accountId][networkId] = collections[accountId][networkId];
      }
    }
    return result;
  }

  private migrateGrc721PinnedPackages(
    pinned: StorageModelDataV021['ACCOUNT_GRC721_PINNED_PACKAGES'],
  ): AccountGRC721PinnedPackagesV022 {
    const result: AccountGRC721PinnedPackagesV022 = {};
    for (const accountId of Object.keys(pinned)) {
      const networks = Object.keys(pinned[accountId]).filter(
        (networkId) => !this.isOldChainId(networkId),
      );
      if (networks.length === 0) {
        continue;
      }
      result[accountId] = {};
      for (const networkId of networks) {
        result[accountId][networkId] = pinned[accountId][networkId];
      }
    }
    return result;
  }
}
