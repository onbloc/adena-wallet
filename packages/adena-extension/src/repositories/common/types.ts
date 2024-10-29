import {
  GRC20TokenModel,
  GRC721CollectionModel,
  GRC721Model,
  GRC721PinnedTokenModel,
  NetworkMetainfo,
  TokenModel,
} from '@types';
import { AppInfoResponse } from './response';

export interface ITokenRepository extends IGRC721TokenRepository {
  supported: boolean;
  apiUrl: string | null;
  queryUrl: string | null;

  setNetworkMetainfo: (networkMetainfo: NetworkMetainfo) => void;
  fetchTokenMetainfos: () => Promise<TokenModel[]>;
  fetchAppInfos: () => Promise<AppInfoResponse[]>;
  fetchAllGRC20Tokens: () => Promise<GRC20TokenModel[]>;

  getAccountTokenMetainfos: (accountId: string) => Promise<TokenModel[]>;
  updateTokenMetainfos: (accountId: string, tokenMetainfos: TokenModel[]) => Promise<boolean>;
  deleteTokenMetainfos: (accountId: string) => Promise<boolean>;
  deleteAllTokenMetainfo: () => Promise<boolean>;
}

export interface IGRC721TokenRepository {
  fetchGRC721Collections: () => Promise<GRC721CollectionModel[]>;
  fetchGRC721CollectionByPackagePath: (packagePath: string) => Promise<GRC721CollectionModel>;
  fetchGRC721TokenUriBy: (packagePath: string, address: string) => Promise<string>;
  fetchGRC721BalanceBy: (packagePath: string, address: string) => Promise<number>;
  fetchGRC721TokensBy: (packagePath: string, address: string) => Promise<GRC721Model[]>;

  getAccountGRC721CollectionsByAccountId: (accountId: string) => Promise<GRC721CollectionModel[]>;
  saveAccountGRC721CollectionsBy: (
    accountId: string,
    collections: GRC721CollectionModel[],
  ) => Promise<boolean>;
  getAccountGRC721PinnedByAccountId: (accountId: string) => Promise<GRC721PinnedTokenModel[]>;
  saveAccountGRC721PinnedBy: (accountId: string, grc721tokens: GRC721Model[]) => Promise<boolean>;
}
