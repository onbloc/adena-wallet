import { Migration } from '@migrates/migrator';
import { StorageModel } from '@common/storage';
import {
  AccountTokenMetainfoModelV003,
  EstablishSitesModelV003,
  NetworksModelV003,
  StorageModelDataV003,
} from '../v003/storage-model-v003';
import {
  AccountTokenMetainfoModelV004,
  EstablishSitesModelV004,
  NetworksModelV004,
  StorageModelDataV004,
} from './storage-model-v004';

export class StorageMigration004 implements Migration<StorageModelDataV004> {
  public readonly version = 4;

  async up(
    current: StorageModel<StorageModelDataV003>,
    password?: string,
  ): Promise<StorageModel<StorageModelDataV004>> {
    if (!this.validateModelV003(current.data)) {
      throw new Error('Stroage Data doesn not match version V003');
    }
    const previous: StorageModelDataV003 = current.data;
    return {
      version: this.version,
      data: {
        ...previous,
        NETWORKS: this.migrateNetworks(previous.NETWORKS),
        ACCOUNT_TOKEN_METAINFOS: this.migrateAccountTokenMetainfo(previous.ACCOUNT_TOKEN_METAINFOS),
        ESTABLISH_SITES: this.migrateEstablishSites(previous.ESTABLISH_SITES),
      },
    };
  }

  private validateModelV003(currentData: StorageModelDataV003): boolean {
    const storageDataKeys = [
      'NETWORKS',
      'CURRENT_CHAIN_ID',
      'CURRENT_NETWORK_ID',
      'SERIALIZED',
      'ENCRYPTED_STORED_PASSWORD',
      'CURRENT_ACCOUNT_ID',
      'ACCOUNT_NAMES',
      'ESTABLISH_SITES',
      'ADDRESS_BOOK',
      'ACCOUNT_TOKEN_METAINFOS',
    ];
    const hasKeys = Object.keys(currentData).every((dataKey) => storageDataKeys.includes(dataKey));
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
    if (typeof currentData.ACCOUNT_NAMES !== 'object') {
      return false;
    }
    if (typeof currentData.ESTABLISH_SITES !== 'object') {
      return false;
    }
    if (typeof currentData.ADDRESS_BOOK !== 'object') {
      return false;
    }
    return true;
  }

  private migrateNetworks(networksDataV003: NetworksModelV003): NetworksModelV004 {
    const networks = networksDataV003.map((network: any, index) => {
      if (index < 3) {
        return {
          ...network,
          id: network.networkId,
          default: true,
          main: network.networkId === 'test3',
        };
      }
      return {
        ...network,
        id: network.networkId || Date.now(),
        default: false,
        main: false,
      };
    });
    return networks;
  }

  private migrateAccountTokenMetainfo(
    accountTokenMetainfo: AccountTokenMetainfoModelV003,
  ): AccountTokenMetainfoModelV004 {
    const changedAccountTokenMetainfo: AccountTokenMetainfoModelV004 = {};
    for (const accountId of Object.keys(accountTokenMetainfo)) {
      const tokenMetainfos = accountTokenMetainfo[accountId].map((tokenMetainfo) => ({
        ...tokenMetainfo,
        networkId:
          tokenMetainfo.type === 'gno-native' && tokenMetainfo.symbol === 'GNOT'
            ? 'DEFAULT'
            : 'test3',
      }));
      changedAccountTokenMetainfo[accountId] = tokenMetainfos;
    }
    return changedAccountTokenMetainfo;
  }

  private migrateEstablishSites(establishSites: EstablishSitesModelV003): EstablishSitesModelV004 {
    const changedEstablishSites: EstablishSitesModelV004 = {};
    for (const accountId of Object.keys(establishSites)) {
      const establishSitesOfAccount = establishSites[accountId].filter(
        (establishSite, index) =>
          establishSites[accountId].findIndex(
            (current) => current.hostname === establishSite.hostname,
          ) === index,
      );
      changedEstablishSites[accountId] = establishSitesOfAccount;
    }
    return changedEstablishSites;
  }
}
