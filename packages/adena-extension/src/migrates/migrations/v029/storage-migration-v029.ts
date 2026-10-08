import { StorageModel } from '@common/storage';
import { Migration } from '@migrates/migrator';
import {
  AccountGRC721CollectionsV022,
  AccountGRC721PinnedPackagesV022,
  AccountTokenMetainfoModelV022,
  EstablishSitesModelV022,
  SessionsModelV022,
} from '../v022/storage-model-v022';
import { StorageModelDataV028 } from '../v028/storage-model-v028';
import { StorageModelDataV029 } from './storage-model-v029';

/**
 * v029 — replace the staging testnet with onyx-1.
 *
 * onyx-1 is a separate chain, so staging state cannot be carried over: any
 * chain-scoped data pinned to staging is dropped, and a user sitting on staging
 * is moved to onyx-1. Other stored networks are left untouched; ChainRepository
 * .getNetworks adds the new onyx-1 default from chains.json.
 */
const OLD_CHAIN_ID = 'staging';
const NEW_CHAIN_ID = 'onyx-1';

export class StorageMigration029 implements Migration<StorageModelDataV029> {
  public readonly version = 29;

  async up(
    current: StorageModel<StorageModelDataV028>,
  ): Promise<StorageModel<StorageModelDataV029>> {
    if (!this.validateModelV028(current.data)) {
      throw new Error('Storage Data does not match version V028');
    }
    const previous: StorageModelDataV028 = current.data;

    return {
      version: this.version,
      data: {
        ...previous,
        CURRENT_CHAIN_ID: this.migrateChainId(previous.CURRENT_CHAIN_ID),
        CURRENT_NETWORK_ID: this.migrateChainId(previous.CURRENT_NETWORK_ID),
        NETWORKS: this.removeOldChainNetworks(previous.NETWORKS),
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

  private validateModelV028(currentData: StorageModelDataV028): boolean {
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
    return this.isOldChainId(id) ? NEW_CHAIN_ID : id;
  }

  private removeOldChainNetworks(
    networks: StorageModelDataV028['NETWORKS'],
  ): StorageModelDataV029['NETWORKS'] {
    return networks.filter(
      (network) => !this.isOldChainId(network.id) && !this.isOldChainId(network.chainId),
    );
  }

  private removeOldChainEstablishSites(
    sites: StorageModelDataV028['ESTABLISH_SITES'],
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
    metainfos: StorageModelDataV028['ACCOUNT_TOKEN_METAINFOS'],
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

  private removeOldChainSessions(sessions: StorageModelDataV028['SESSIONS']): SessionsModelV022 {
    const result: SessionsModelV022 = {};
    for (const sessionAddr of Object.keys(sessions)) {
      if (!this.isOldChainId(sessions[sessionAddr].chainId)) {
        result[sessionAddr] = sessions[sessionAddr];
      }
    }
    return result;
  }

  private migrateGrc721Collections(
    collections: StorageModelDataV028['ACCOUNT_GRC721_COLLECTIONS'],
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
    pinned: StorageModelDataV028['ACCOUNT_GRC721_PINNED_PACKAGES'],
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
