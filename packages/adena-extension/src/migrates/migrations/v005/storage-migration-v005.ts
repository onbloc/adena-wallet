import { Migration } from '@migrates/migrator';
import { StorageModel } from '@common/storage';
import {
  AccountTokenMetainfoModelV004,
  EstablishSitesModelV004,
  NetworksModelV004,
  StorageModelDataV004,
} from '../v004/storage-model-v004';
import {
  AccountTokenMetainfoModelV005,
  EstablishSitesModelV005,
  NetworksModelV005,
  StorageModelDataV005,
} from './storage-model-v005';

export class StorageMigration005 implements Migration<StorageModelDataV005> {
  public readonly version = 5;

  async up(
    current: StorageModel<StorageModelDataV004>,
  ): Promise<StorageModel<StorageModelDataV005>> {
    if (!this.validateModelV004(current.data)) {
      throw new Error('Storage Data does not match version V004');
    }
    const previous: StorageModelDataV004 = current.data;
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

  private validateModelV004(currentData: StorageModelDataV004): boolean {
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

  private migrateNetworks(networksDataV004: NetworksModelV004): NetworksModelV005 {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const networks = networksDataV004.map((network: any, index) => {
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
    accountTokenMetainfo: AccountTokenMetainfoModelV004,
  ): AccountTokenMetainfoModelV005 {
    const changedAccountTokenMetainfo: AccountTokenMetainfoModelV005 = {};
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

  private migrateEstablishSites(establishSites: EstablishSitesModelV004): EstablishSitesModelV005 {
    const changedEstablishSites: EstablishSitesModelV005 = {};
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
