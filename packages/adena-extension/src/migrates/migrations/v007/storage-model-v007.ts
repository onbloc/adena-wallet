export type StorageModelV007 = {
  version: 7;
  data: StorageModelDataV007;
};

export type StorageModelDataV007 = {
  NETWORKS: NetworksModelV007;
  CURRENT_CHAIN_ID: CurrentChainIdModelV007;
  CURRENT_NETWORK_ID: CurrentNetworkIdModelV007;
  SERIALIZED: SerializedModelV007;
  ENCRYPTED_STORED_PASSWORD: EncryptedStoredPasswordModelV007;
  CURRENT_ACCOUNT_ID: CurrentAccountIdModelV007;
  ACCOUNT_NAMES: AccountNamesModelV007;
  ESTABLISH_SITES: EstablishSitesModelV007;
  ADDRESS_BOOK: AddressBookModelV007;
  ACCOUNT_TOKEN_METAINFOS: AccountTokenMetainfoModelV007;
  QUESTIONNAIRE_EXPIRED_DATE: QuestionnaireExpiredDateModelV007;
  WALLET_CREATION_GUIDE_CONFIRM_DATE: WalletCreationGuideConfirmDateModelV007;
  ADD_ACCOUNT_GUIDE_CONFIRM_DATE: AddAccountGuideConfirmDateModelV007;
  ACCOUNT_GRC721_COLLECTIONS: AccountGRC721CollectionsV007;
  ACCOUNT_GRC721_PINNED_PACKAGES: AccountGRC721PinnedPackagesV007;
};

export type NetworksModelV007 = {
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

export type CurrentChainIdModelV007 = string;

export type CurrentNetworkIdModelV007 = string;

export type SerializedModelV007 = string;

export type QuestionnaireExpiredDateModelV007 = number | null;

export type WalletCreationGuideConfirmDateModelV007 = number | null;

export type AddAccountGuideConfirmDateModelV007 = number | null;

export type WalletModelV007 = {
  accounts: AccountDataModelV007[];
  keyrings: KeyringDataModelV007[];
  currentAccountId?: string;
};

type AccountDataModelV007 = {
  id?: string;
  index: number;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP';
  name: string;
  keyringId: string;
  hdPath?: number;
  publicKey: number[];
  addressBytes?: number[];
};

type KeyringDataModelV007 = {
  id?: string;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP';
  publicKey?: number[];
  privateKey?: number[];
  seed?: number[];
  mnemonic?: string;
  addressBytes?: number[];
};

export type EncryptedStoredPasswordModelV007 = string;

export type CurrentAccountIdModelV007 = string;

export type AccountNamesModelV007 = { [key in string]: string };

export type EstablishSitesModelV007 = {
  [key in string]: {
    hostname: string;
    chainId: string;
    account: string;
    name: string;
    favicon: string | null;
    establishedTime: string;
  }[];
};

export type AddressBookModelV007 = string;

export type AccountTokenMetainfoModelV007 = {
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

export type AccountGRC721CollectionsV007 = {
  [key in string]: {
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
  };
};

export type AccountGRC721PinnedPackagesV007 = {
  [key in string]: string[];
};
