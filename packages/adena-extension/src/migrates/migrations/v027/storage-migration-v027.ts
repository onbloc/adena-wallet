import { StorageModel } from '@common/storage';
import { Migration } from '@migrates/migrator';
import { StorageModelDataV026 } from '../v026/storage-model-v026';
import { NetworksModelV027, StorageModelDataV027 } from './storage-model-v027';

/**
 * v027 — point the default gnoland-1 mainnet at rpc.gno.land, with
 * rpc.onbloc.xyz as fallback.
 *
 * chains.json now ships rpc.gno.land as the bundled primary, but ChainRepository
 * .getNetworks keeps a stored default's rpcUrl whenever it differs from the
 * bundled one and drops fallbackRPCUrl in that case. Existing installs stored
 * rpc.onbloc.xyz as the bundled default, so without this migration they would be
 * treated as user-customized and never receive the new primary/fallback pair.
 *
 * Only an untouched old default is rewritten: a gnoland-1 network whose rpcUrl
 * still equals the previous bundled value. A genuinely customized rpcUrl is left
 * as-is.
 */
const MAINNET_ID = 'gnoland-1';
const OLD_PRIMARY_RPC_URL = 'https://rpc.onbloc.xyz:443';
const NEW_PRIMARY_RPC_URL = 'https://rpc.gno.land:443';
const NEW_FALLBACK_RPC_URL = 'https://rpc.onbloc.xyz:443';

export class StorageMigration027 implements Migration<StorageModelDataV027> {
  public readonly version = 27;

  async up(
    current: StorageModel<StorageModelDataV026>,
  ): Promise<StorageModel<StorageModelDataV027>> {
    if (!this.validateModelV026(current.data)) {
      throw new Error('Storage Data does not match version V026');
    }
    const previous: StorageModelDataV026 = current.data;

    return {
      version: this.version,
      data: {
        ...previous,
        NETWORKS: this.migrateNetworks(previous.NETWORKS),
      },
    };
  }

  private validateModelV026(currentData: StorageModelDataV026): boolean {
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
    return true;
  }

  private migrateNetworks(networks: StorageModelDataV026['NETWORKS']): NetworksModelV027 {
    return networks.map((network) => {
      if (network.id !== MAINNET_ID || network.rpcUrl !== OLD_PRIMARY_RPC_URL) {
        return network;
      }
      return {
        ...network,
        rpcUrl: NEW_PRIMARY_RPC_URL,
        fallbackRPCUrl: NEW_FALLBACK_RPC_URL,
      };
    });
  }
}
