export type StorageModelV022 = {
  version: 22;
  data: StorageModelDataV022;
};

export type StorageModelDataV022 = {
  NETWORKS: NetworksModelV022;
  CURRENT_CHAIN_ID: CurrentChainIdModelV022;
  CURRENT_NETWORK_ID: CurrentNetworkIdModelV022;
  SERIALIZED: SerializedModelV022;
  ENCRYPTED_STORED_PASSWORD: EncryptedStoredPasswordModelV022;
  CURRENT_ACCOUNT_ID: CurrentAccountIdModelV022;
  ACCOUNT_NAMES: AccountNamesModelV022;
  ESTABLISH_SITES: EstablishSitesModelV022;
  ADDRESS_BOOK: AddressBookModelV022;
  ACCOUNT_TOKEN_METAINFOS: AccountTokenMetainfoModelV022;
  QUESTIONNAIRE_EXPIRED_DATE: QuestionnaireExpiredDateModelV022;
  WALLET_CREATION_GUIDE_CONFIRM_DATE: WalletCreationGuideConfirmDateModelV022;
  ADD_ACCOUNT_GUIDE_CONFIRM_DATE: AddAccountGuideConfirmDateModelV022;
  ACCOUNT_GRC721_COLLECTIONS: AccountGRC721CollectionsV022;
  ACCOUNT_GRC721_PINNED_PACKAGES: AccountGRC721PinnedPackagesV022;
  KDF_SALT: KdfSaltModelV022;
  SESSIONS: SessionsModelV022;
};

export type KdfSaltModelV022 = string;

export type NetworksModelV022 = {
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
  gnoUrl?: string;
  apiUrl?: string;
  linkUrl?: string;
  deleted?: boolean;
}[];

export type CurrentChainIdModelV022 = string;

export type CurrentNetworkIdModelV022 = string;

export type SerializedModelV022 = string;

export type QuestionnaireExpiredDateModelV022 = number | null;

export type WalletCreationGuideConfirmDateModelV022 = number | null;

export type AddAccountGuideConfirmDateModelV022 = number | null;

export type WalletModelV022 = {
  accounts: AccountDataModelV022[];
  keyrings: KeyringDataModelV022[];
  currentAccountId?: string;
};

export type AccountDataModelV022 = {
  id?: string;
  index: number;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP';
  name: string;
  keyringId: string;
  // hdPath is the BIP44 address index. account'/change are the upper path
  // segments (default 0 when absent, matching pre-custom-path accounts).
  hdPath?: number;
  accountIndex?: number;
  changeIndex?: number;
  publicKey: number[];
  addressBytes?: number[];
};

export type KeyringDataModelV022 = {
  id?: string;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP';
  publicKey?: number[];
  privateKey?: number[];
  seed?: number[];
  mnemonic?: string;
  addressBytes?: number[];
};

export type EncryptedStoredPasswordModelV022 = string;

export type CurrentAccountIdModelV022 = string;

type AccountId = string;
type NetworkId = string;
type SessionAddr = string;

export type AccountNamesModelV022 = { [key in AccountId]: string };

export type EstablishSitesModelV022 = {
  [key in AccountId]: {
    hostname: string;
    chainId: string;
    account: string;
    name: string;
    favicon: string | null;
    establishedTime: string;
  }[];
};

export type AddressBookModelV022 = string;

export type AccountTokenMetainfoModelV022 = {
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

export type AccountGRC721CollectionsV022 = {
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

export type AccountGRC721PinnedPackagesV022 = {
  [key in AccountId]: { [key in NetworkId]: string[] };
};

export type SessionMetadataV022 = {
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

export type SessionsModelV022 = {
  [key in SessionAddr]: SessionMetadataV022;
};
