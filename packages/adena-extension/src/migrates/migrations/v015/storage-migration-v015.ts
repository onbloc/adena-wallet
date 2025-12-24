import { decryptAES, encryptAES } from 'adena-module';
import { StorageModel } from '@common/storage';
import { Migration } from '@migrates/migrator';
import CHAIN_DATA from '@resources/chains/chains.json';
import {
  CurrentChainIdModelV014,
  CurrentNetworkIdModelV014,
  NetworksModelV014,
  AccountDataModelV014,
  KeyringDataModelV014,
  WalletModelV014,
  StorageModelDataV014,
} from '../v014/storage-model-v014';
import {
  CurrentChainIdModelV015,
  CurrentNetworkIdModelV015,
  NetworksModelV015,
  AccountDataModelV015,
  KeyringDataModelV015,
  WalletModelV015,
  StorageModelDataV015,
} from './storage-model-v015';

export class StorageMigration015 implements Migration<StorageModelDataV015> {
  public readonly version = 15;

  async up(
    current: StorageModel<StorageModelDataV014>,
    password?: string,
  ): Promise<StorageModel<StorageModelDataV015>> {
    if (!this.validateModelV014(current.data)) {
      throw new Error('Storage Data does not match version V014');
    }
    const previous: StorageModelDataV014 = current.data;
    return {
      version: this.version,
      data: {
        ...previous,
        CURRENT_CHAIN_ID: this.migrateCurrentChainId(previous.CURRENT_CHAIN_ID),
        CURRENT_NETWORK_ID: this.migrateCurrentNetworkId(previous.CURRENT_NETWORK_ID),
        NETWORKS: this.migrateNetwork(previous.NETWORKS),
        SERIALIZED: await this.migrateWallet(previous.SERIALIZED, password),
      },
    };
  }

  private validateModelV014(currentData: StorageModelDataV014): boolean {
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

  private migrateCurrentChainId(currentChainId: CurrentChainIdModelV014): CurrentChainIdModelV015 {
    if (currentChainId === 'test9' || currentChainId === 'test9.1') {
      return 'test10';
    }
    return currentChainId;
  }

  private migrateCurrentNetworkId(
    currentNetworkId: CurrentNetworkIdModelV014,
  ): CurrentNetworkIdModelV015 {
    if (currentNetworkId === 'test9' || currentNetworkId === 'test9.1') {
      return 'test10';
    }
    return currentNetworkId;
  }

  private migrateNetwork(networks: NetworksModelV014): NetworksModelV015 {
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

  private async migrateWallet(serialized: string, password?: string): Promise<string> {
    if (!password) {
      return serialized;
    }

    const decrypted = await decryptAES(serialized, password);
    const wallet: WalletModelV014 = JSON.parse(decrypted);

    const migrated: WalletModelV015 = {
      ...wallet,
      accounts: wallet.accounts.map((account) => this.migrateAccount(account)),
      keyrings: wallet.keyrings.map((keyring) => this.migrateKeyring(keyring)),
    };

    const json = JSON.stringify(migrated);
    const encrypted = await encryptAES(json, password);
    return encrypted;
  }

  private migrateAccount(account: AccountDataModelV014): AccountDataModelV015 {
    return account as AccountDataModelV015;
  }

  private migrateKeyring(keyring: KeyringDataModelV014): KeyringDataModelV015 {
    return keyring as KeyringDataModelV015;
  }
}
