export type StorageModelV020 = {
  version: 20;
  data: StorageModelDataV020;
};

export type StorageModelDataV020 = {
  NETWORKS: NetworksModelV020;
  CURRENT_CHAIN_ID: CurrentChainIdModelV020;
  CURRENT_NETWORK_ID: CurrentNetworkIdModelV020;
  SERIALIZED: SerializedModelV020;
  ENCRYPTED_STORED_PASSWORD: EncryptedStoredPasswordModelV020;
  CURRENT_ACCOUNT_ID: CurrentAccountIdModelV020;
  ACCOUNT_NAMES: AccountNamesModelV020;
  ESTABLISH_SITES: EstablishSitesModelV020;
  ADDRESS_BOOK: AddressBookModelV020;
  ACCOUNT_TOKEN_METAINFOS: AccountTokenMetainfoModelV020;
  QUESTIONNAIRE_EXPIRED_DATE: QuestionnaireExpiredDateModelV020;
  WALLET_CREATION_GUIDE_CONFIRM_DATE: WalletCreationGuideConfirmDateModelV020;
  ADD_ACCOUNT_GUIDE_CONFIRM_DATE: AddAccountGuideConfirmDateModelV020;
  ACCOUNT_GRC721_COLLECTIONS: AccountGRC721CollectionsV020;
  ACCOUNT_GRC721_PINNED_PACKAGES: AccountGRC721PinnedPackagesV020;
  KDF_SALT: KdfSaltModelV020;
  SESSIONS: SessionsModelV020;
};

export type KdfSaltModelV020 = string;

export type NetworksModelV020 = {
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

export type CurrentChainIdModelV020 = string;

export type CurrentNetworkIdModelV020 = string;

export type SerializedModelV020 = string;

export type QuestionnaireExpiredDateModelV020 = number | null;

export type WalletCreationGuideConfirmDateModelV020 = number | null;

export type AddAccountGuideConfirmDateModelV020 = number | null;

export type WalletModelV020 = {
  accounts: AccountDataModelV020[];
  keyrings: KeyringDataModelV020[];
  currentAccountId?: string;
};

export type AccountDataModelV020 = {
  id?: string;
  index: number;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP';
  name: string;
  keyringId: string;
  hdPath?: number;
  publicKey: number[];
  addressBytes?: number[];
};

export type KeyringDataModelV020 = {
  id?: string;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP';
  publicKey?: number[];
  privateKey?: number[];
  seed?: number[];
  mnemonic?: string;
  addressBytes?: number[];
};

export type EncryptedStoredPasswordModelV020 = string;

export type CurrentAccountIdModelV020 = string;

type AccountId = string;
type NetworkId = string;
type SessionAddr = string;

export type AccountNamesModelV020 = { [key in AccountId]: string };

export type EstablishSitesModelV020 = {
  [key in AccountId]: {
    hostname: string;
    chainId: string;
    account: string;
    name: string;
    favicon: string | null;
    establishedTime: string;
  }[];
};

export type AddressBookModelV020 = string;

export type AccountTokenMetainfoModelV020 = {
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

export type AccountGRC721CollectionsV020 = {
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

export type AccountGRC721PinnedPackagesV020 = {
  [key in AccountId]: { [key in NetworkId]: string[] };
};

export type SessionMetadataV020 = {
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

export type SessionsModelV020 = {
  [key in SessionAddr]: SessionMetadataV020;
};
