export type StorageModelV008 = {
  version: 8;
  data: StorageModelDataV008;
};

export type StorageModelDataV008 = {
  NETWORKS: NetworksModelV008;
  CURRENT_CHAIN_ID: CurrentChainIdModelV008;
  CURRENT_NETWORK_ID: CurrentNetworkIdModelV008;
  SERIALIZED: SerializedModelV008;
  ENCRYPTED_STORED_PASSWORD: EncryptedStoredPasswordModelV008;
  CURRENT_ACCOUNT_ID: CurrentAccountIdModelV008;
  ACCOUNT_NAMES: AccountNamesModelV008;
  ESTABLISH_SITES: EstablishSitesModelV008;
  ADDRESS_BOOK: AddressBookModelV008;
  ACCOUNT_TOKEN_METAINFOS: AccountTokenMetainfoModelV008;
  QUESTIONNAIRE_EXPIRED_DATE: QuestionnaireExpiredDateModelV008;
  WALLET_CREATION_GUIDE_CONFIRM_DATE: WalletCreationGuideConfirmDateModelV008;
  ADD_ACCOUNT_GUIDE_CONFIRM_DATE: AddAccountGuideConfirmDateModelV008;
  ACCOUNT_GRC721_COLLECTIONS: AccountGRC721CollectionsV008;
  ACCOUNT_GRC721_PINNED_PACKAGES: AccountGRC721PinnedPackagesV008;
};

export type NetworksModelV008 = {
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

export type CurrentChainIdModelV008 = string;

export type CurrentNetworkIdModelV008 = string;

export type SerializedModelV008 = string;

export type QuestionnaireExpiredDateModelV008 = number | null;

export type WalletCreationGuideConfirmDateModelV008 = number | null;

export type AddAccountGuideConfirmDateModelV008 = number | null;

export type WalletModelV008 = {
  accounts: AccountDataModelV008[];
  keyrings: KeyringDataModelV008[];
  currentAccountId?: string;
};

type AccountDataModelV008 = {
  id?: string;
  index: number;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP';
  name: string;
  keyringId: string;
  hdPath?: number;
  publicKey: number[];
  addressBytes?: number[];
};

type KeyringDataModelV008 = {
  id?: string;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP';
  publicKey?: number[];
  privateKey?: number[];
  seed?: number[];
  mnemonic?: string;
  addressBytes?: number[];
};

export type EncryptedStoredPasswordModelV008 = string;

export type CurrentAccountIdModelV008 = string;

type AccountId = string;
type NetworkId = string;

export type AccountNamesModelV008 = { [key in AccountId]: string };

export type EstablishSitesModelV008 = {
  [key in AccountId]: {
    hostname: string;
    chainId: string;
    account: string;
    name: string;
    favicon: string | null;
    establishedTime: string;
  }[];
};

export type AddressBookModelV008 = string;

export type AccountTokenMetainfoModelV008 = {
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

export type AccountGRC721CollectionsV008 = {
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

export type AccountGRC721PinnedPackagesV008 = {
  [key in AccountId]: { [key in NetworkId]: string[] };
};
