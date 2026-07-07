export type StorageModelV021 = {
  version: 21;
  data: StorageModelDataV021;
};

export type StorageModelDataV021 = {
  NETWORKS: NetworksModelV021;
  CURRENT_CHAIN_ID: CurrentChainIdModelV021;
  CURRENT_NETWORK_ID: CurrentNetworkIdModelV021;
  SERIALIZED: SerializedModelV021;
  ENCRYPTED_STORED_PASSWORD: EncryptedStoredPasswordModelV021;
  CURRENT_ACCOUNT_ID: CurrentAccountIdModelV021;
  ACCOUNT_NAMES: AccountNamesModelV021;
  ESTABLISH_SITES: EstablishSitesModelV021;
  ADDRESS_BOOK: AddressBookModelV021;
  ACCOUNT_TOKEN_METAINFOS: AccountTokenMetainfoModelV021;
  QUESTIONNAIRE_EXPIRED_DATE: QuestionnaireExpiredDateModelV021;
  WALLET_CREATION_GUIDE_CONFIRM_DATE: WalletCreationGuideConfirmDateModelV021;
  ADD_ACCOUNT_GUIDE_CONFIRM_DATE: AddAccountGuideConfirmDateModelV021;
  ACCOUNT_GRC721_COLLECTIONS: AccountGRC721CollectionsV021;
  ACCOUNT_GRC721_PINNED_PACKAGES: AccountGRC721PinnedPackagesV021;
  KDF_SALT: KdfSaltModelV021;
  SESSIONS: SessionsModelV021;
};

export type KdfSaltModelV021 = string;

export type NetworksModelV021 = {
  id: string;
  default: boolean;
  main: boolean;
  chainId: string;
  chainName: string;
  networkId: string;
  networkName: string;
  addressPrefix: string;
  rpcUrl: string;
  indexerUrl: string;
  gnoUrl: string;
  apiUrl: string;
  linkUrl: string;
  deleted?: boolean;
}[];

export type CurrentChainIdModelV021 = string;

export type CurrentNetworkIdModelV021 = string;

export type SerializedModelV021 = string;

export type QuestionnaireExpiredDateModelV021 = number | null;

export type WalletCreationGuideConfirmDateModelV021 = number | null;

export type AddAccountGuideConfirmDateModelV021 = number | null;

export type WalletModelV021 = {
  accounts: AccountDataModelV021[];
  keyrings: KeyringDataModelV021[];
  currentAccountId?: string;
};

export type AccountDataModelV021 = {
  id?: string;
  index: number;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP';
  name: string;
  keyringId: string;
  hdPath?: number;
  publicKey: number[];
  addressBytes?: number[];
};

export type KeyringDataModelV021 = {
  id?: string;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP';
  publicKey?: number[];
  privateKey?: number[];
  seed?: number[];
  mnemonic?: string;
  addressBytes?: number[];
};

export type EncryptedStoredPasswordModelV021 = string;

export type CurrentAccountIdModelV021 = string;

type AccountId = string;
type NetworkId = string;
type SessionAddr = string;

export type AccountNamesModelV021 = { [key in AccountId]: string };

export type EstablishSitesModelV021 = {
  [key in AccountId]: {
    hostname: string;
    chainId: string;
    account: string;
    name: string;
    favicon: string | null;
    establishedTime: string;
  }[];
};

export type AddressBookModelV021 = string;

export type AccountTokenMetainfoModelV021 = {
  [key in string]: {
    main: boolean;
    tokenId: string;
    networkId: string;
    display: boolean;
    type: 'gno-native' | 'grc20' | 'ibc-native' | 'ibc-tokens';
    name: string;
    symbol: string;
    decimals: number;
    description?: string;
    websiteUrl?: string;
    image: string;
    denom?: string;
    pkgPath?: string;
    originChain?: string;
    originDenom?: string;
    originType?: string;
    path?: string;
    channel?: string;
    port?: string;
  }[];
};

export type AccountGRC721CollectionsV021 = {
  [key in AccountId]: {
    [key in NetworkId]: {
      tokenId: string;
      networkId: string;
      display: boolean;
      type: 'grc721';
      packagePath: string;
      name: string;
      symbol: string;
      image: string | null;
      isTokenUri: boolean;
      isMetadata: boolean;
    }[];
  };
};

export type AccountGRC721PinnedPackagesV021 = {
  [key in AccountId]: { [key in NetworkId]: string[] };
};

export type SessionMetadataV021 = {
  masterAddress: string;
  chainId: string;
  allowPaths: string[];
  spendLimit: string;
  spendPeriod: number;
  spendUsed?: string;
  spendReset?: number;
  expiresAt: number;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  createdAt: number;
  txHash?: string;
};

export type SessionsModelV021 = {
  [key in SessionAddr]: SessionMetadataV021;
};
