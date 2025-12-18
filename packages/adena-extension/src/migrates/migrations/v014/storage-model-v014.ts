export type StorageModelV014 = {
  version: 14;
  data: StorageModelDataV014;
};

export type StorageModelDataV014 = {
  NETWORKS: NetworksModelV014;
  CURRENT_CHAIN_ID: CurrentChainIdModelV014;
  CURRENT_NETWORK_ID: CurrentNetworkIdModelV014;
  SERIALIZED: SerializedModelV014;
  ENCRYPTED_STORED_PASSWORD: EncryptedStoredPasswordModelV014;
  CURRENT_ACCOUNT_ID: CurrentAccountIdModelV014;
  ACCOUNT_NAMES: AccountNamesModelV014;
  ESTABLISH_SITES: EstablishSitesModelV014;
  ADDRESS_BOOK: AddressBookModelV014;
  ACCOUNT_TOKEN_METAINFOS: AccountTokenMetainfoModelV014;
  QUESTIONNAIRE_EXPIRED_DATE: QuestionnaireExpiredDateModelV014;
  WALLET_CREATION_GUIDE_CONFIRM_DATE: WalletCreationGuideConfirmDateModelV014;
  ADD_ACCOUNT_GUIDE_CONFIRM_DATE: AddAccountGuideConfirmDateModelV014;
  ACCOUNT_GRC721_COLLECTIONS: AccountGRC721CollectionsV014;
  ACCOUNT_GRC721_PINNED_PACKAGES: AccountGRC721PinnedPackagesV014;
};

export type NetworksModelV014 = {
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

export type CurrentChainIdModelV014 = string;

export type CurrentNetworkIdModelV014 = string;

export type SerializedModelV014 = string;

export type QuestionnaireExpiredDateModelV014 = number | null;

export type WalletCreationGuideConfirmDateModelV014 = number | null;

export type AddAccountGuideConfirmDateModelV014 = number | null;

export type WalletModelV014 = {
  accounts: AccountDataModelV014[];
  keyrings: KeyringDataModelV014[];
  currentAccountId?: string;
};

type AccountDataModelV014 = {
  id?: string;
  index: number;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP';
  name: string;
  keyringId: string;
  hdPath?: number;
  publicKey: number[];
  addressBytes?: number[];
};

export type KeyringDataModelV014 = {
  id?: string;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP';
  publicKey?: number[];
  privateKey?: number[];
  seed?: number[];
  mnemonic?: string;
  addressBytes?: number[];
};

export type EncryptedStoredPasswordModelV014 = string;

export type CurrentAccountIdModelV014 = string;

type AccountId = string;
type NetworkId = string;

export type AccountNamesModelV014 = { [key in AccountId]: string };

export type EstablishSitesModelV014 = {
  [key in AccountId]: {
    hostname: string;
    chainId: string;
    account: string;
    name: string;
    favicon: string | null;
    establishedTime: string;
  }[];
};

export type AddressBookModelV014 = string;

export type AccountTokenMetainfoModelV014 = {
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

export type AccountGRC721CollectionsV014 = {
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

export type AccountGRC721PinnedPackagesV014 = {
  [key in AccountId]: { [key in NetworkId]: string[] };
};
