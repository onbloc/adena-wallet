import { StorageModel } from '@common/storage';
import { Migration } from '@migrates/migrator';
import CHAIN_DATA from '@resources/chains/chains.json';
import { StorageModelDataV018 } from '../v018/storage-model-v018';
import {
  AccountGRC721CollectionsV019,
  AccountGRC721PinnedPackagesV019,
  AccountTokenMetainfoModelV019,
  EstablishSitesModelV019,
  NetworksModelV019,
  StorageModelDataV019,
} from './storage-model-v019';

const OLD_CHAIN_ID = 'test13';
const NEW_CHAIN_ID = 'test-13';

export class StorageMigration019 implements Migration<StorageModelDataV019> {
  public readonly version = 19;

  async up(
    current: StorageModel<StorageModelDataV018>,
  ): Promise<StorageModel<StorageModelDataV019>> {
    if (!this.validateModelV018(current.data)) {
      throw new Error('Storage Data does not match version V018');
    }
    const previous: StorageModelDataV018 = current.data;
    return {
      version: this.version,
      data: {
        ...previous,
        CURRENT_CHAIN_ID: this.migrateChainId(previous.CURRENT_CHAIN_ID),
        CURRENT_NETWORK_ID: this.migrateChainId(previous.CURRENT_NETWORK_ID),
        NETWORKS: this.migrateNetworks(previous.NETWORKS),
        ESTABLISH_SITES: this.migrateEstablishSites(previous.ESTABLISH_SITES),
        ACCOUNT_TOKEN_METAINFOS: this.migrateTokenMetainfos(previous.ACCOUNT_TOKEN_METAINFOS),
        ACCOUNT_GRC721_COLLECTIONS: this.migrateGrc721Collections(
          previous.ACCOUNT_GRC721_COLLECTIONS,
        ),
        ACCOUNT_GRC721_PINNED_PACKAGES: this.migrateGrc721PinnedPackages(
          previous.ACCOUNT_GRC721_PINNED_PACKAGES,
        ),
      },
    };
  }

  private validateModelV018(currentData: StorageModelDataV018): boolean {
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
    return true;
  }

  private migrateChainId(id: string): string {
    return id === OLD_CHAIN_ID ? NEW_CHAIN_ID : id;
  }

  private migrateNetworks(networks: StorageModelDataV018['NETWORKS']): NetworksModelV019 {
    const defaultNetworks = CHAIN_DATA.filter((n) => n.default);
    const customNetworks = networks
      .filter((n) => !n.default)
      .map((n) => {
        const provided = CHAIN_DATA.find((d) => d.chainId === n.id);
        if (provided) {
          return { ...provided, chainName: n.chainName, networkName: n.networkName, rpcUrl: n.rpcUrl };
        }
        return { ...n, indexerUrl: n.indexerUrl || '' };
      });
    return [...defaultNetworks, ...customNetworks];
  }

  private migrateEstablishSites(
    sites: StorageModelDataV018['ESTABLISH_SITES'],
  ): EstablishSitesModelV019 {
    const result: EstablishSitesModelV019 = {};
    for (const accountId of Object.keys(sites)) {
      result[accountId] = sites[accountId].map((site) => ({
        ...site,
        chainId: site.chainId === OLD_CHAIN_ID ? NEW_CHAIN_ID : site.chainId,
      }));
    }
    return result;
  }

  private migrateTokenMetainfos(
    metainfos: StorageModelDataV018['ACCOUNT_TOKEN_METAINFOS'],
  ): AccountTokenMetainfoModelV019 {
    const result: AccountTokenMetainfoModelV019 = {};
    for (const accountId of Object.keys(metainfos)) {
      result[accountId] = metainfos[accountId].map((token) => ({
        ...token,
        networkId: token.networkId === OLD_CHAIN_ID ? NEW_CHAIN_ID : token.networkId,
      }));
    }
    return result;
  }

  private migrateGrc721Collections(
    collections: StorageModelDataV018['ACCOUNT_GRC721_COLLECTIONS'],
  ): AccountGRC721CollectionsV019 {
    const result: AccountGRC721CollectionsV019 = {};
    for (const accountId of Object.keys(collections)) {
      result[accountId] = {};
      for (const networkId of Object.keys(collections[accountId])) {
        const newNetworkId = networkId === OLD_CHAIN_ID ? NEW_CHAIN_ID : networkId;
        result[accountId][newNetworkId] = collections[accountId][networkId].map((item) => ({
          ...item,
          networkId: item.networkId === OLD_CHAIN_ID ? NEW_CHAIN_ID : item.networkId,
        }));
      }
    }
    return result;
  }

  private migrateGrc721PinnedPackages(
    pinned: StorageModelDataV018['ACCOUNT_GRC721_PINNED_PACKAGES'],
  ): AccountGRC721PinnedPackagesV019 {
    const result: AccountGRC721PinnedPackagesV019 = {};
    for (const accountId of Object.keys(pinned)) {
      result[accountId] = {};
      for (const networkId of Object.keys(pinned[accountId])) {
        const newNetworkId = networkId === OLD_CHAIN_ID ? NEW_CHAIN_ID : networkId;
        result[accountId][newNetworkId] = pinned[accountId][networkId];
      }
    }
    return result;
  }
}
