import { StorageModel } from '@common/storage';
import { toTokenPath } from '@common/utils/grc20-token-path';
import { Migration } from '@migrates/migrator';
import {
  AccountTokenMetainfoModelV022,
  StorageModelDataV022,
} from '../v022/storage-model-v022';
import { StorageModelDataV023 } from './storage-model-v023';

/**
 * v023 — re-key GRC20 tokens by token path.
 *
 * GRC20 tokens used to be identified by their bare packagePath (tokenId ===
 * pkgPath). The wallet now identifies a GRC20 token by its token key
 * `{packagePath}.{symbol}` so that a realm registering multiple symbols yields
 * distinct tokens. This migration rewrites the tokenId of every stored GRC20
 * token from `pkgPath` to `pkgPath.symbol`; all other fields (and non-GRC20
 * tokens) are left untouched. The storage shape is unchanged.
 */
export class StorageMigration023 implements Migration<StorageModelDataV023> {
  public readonly version = 23;

  async up(
    current: StorageModel<StorageModelDataV022>,
  ): Promise<StorageModel<StorageModelDataV023>> {
    if (!this.validateModelV022(current.data)) {
      throw new Error('Storage Data does not match version V022');
    }
    const previous: StorageModelDataV022 = current.data;

    return {
      version: this.version,
      data: {
        ...previous,
        ACCOUNT_TOKEN_METAINFOS: this.migrateTokenMetainfos(previous.ACCOUNT_TOKEN_METAINFOS),
      },
    };
  }

  private migrateTokenMetainfos(
    metainfos: AccountTokenMetainfoModelV022,
  ): AccountTokenMetainfoModelV022 {
    const result: AccountTokenMetainfoModelV022 = {};
    for (const accountId of Object.keys(metainfos)) {
      result[accountId] = metainfos[accountId].map((token) => {
        // Only GRC20 tokens are re-keyed, and only when both parts are present.
        if (token.type === 'grc20' && token.pkgPath && token.symbol) {
          return { ...token, tokenId: toTokenPath(token.pkgPath, token.symbol) };
        }
        return token;
      });
    }
    return result;
  }

  private validateModelV022(currentData: StorageModelDataV022): boolean {
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
    if (!storageDataKeys.every((key) => currentDataKeys.includes(key))) {
      return false;
    }
    if (
      typeof currentData.ACCOUNT_TOKEN_METAINFOS !== 'object' ||
      currentData.ACCOUNT_TOKEN_METAINFOS === null
    ) {
      return false;
    }
    return true;
  }
}
