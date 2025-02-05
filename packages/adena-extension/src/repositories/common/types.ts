import {
  GRC20TokenModel,
  GRC721CollectionModel,
  GRC721MetadataModel,
  GRC721Model,
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
  fetchAllTransferPackagesBy: (address: string, fromBlockHeight: number) => Promise<string[]>;
  fetchGRC20TokenByPackagePath: (packagePath: string) => Promise<GRC20TokenModel>;

  getAccountTokenMetainfos: (accountId: string) => Promise<TokenModel[]>;
  updateTokenMetainfos: (accountId: string, tokenMetainfos: TokenModel[]) => Promise<boolean>;
  deleteTokenMetainfos: (accountId: string) => Promise<boolean>;
  deleteAllTokenMetainfo: () => Promise<boolean>;
}

export interface IGRC721TokenRepository {
  fetchGRC721Collections: () => Promise<GRC721CollectionModel[]>;
  fetchGRC721CollectionByPackagePath: (packagePath: string) => Promise<GRC721CollectionModel>;
  fetchGRC721TokenUriBy: (packagePath: string, address: string) => Promise<string>;
  fetchGRC721TokenMetadataBy: (
    packagePath: string,
    address: string,
  ) => Promise<GRC721MetadataModel>;
  fetchGRC721BalanceBy: (packagePath: string, address: string) => Promise<number>;
  fetchGRC721TokensBy: (packagePath: string, address: string) => Promise<GRC721Model[]>;

  getAccountGRC721CollectionsBy: (
    accountId: string,
    networkId: string,
  ) => Promise<GRC721CollectionModel[]>;
  saveAccountGRC721CollectionsBy: (
    accountId: string,
    networkId: string,
    collections: GRC721CollectionModel[],
  ) => Promise<boolean>;
  getAccountGRC721PinnedPackagesBy: (accountId: string, networkId: string) => Promise<string[]>;
  saveAccountGRC721PinnedPackagesBy: (
    accountId: string,
    networkId: string,
    packagePaths: string[],
  ) => Promise<boolean>;
}
