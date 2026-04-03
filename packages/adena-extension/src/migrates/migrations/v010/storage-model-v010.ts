export type StorageModelV010 = {
  version: 10;
  data: StorageModelDataV010;
};

export type StorageModelDataV010 = {
  NETWORKS: NetworksModelV010;
  CURRENT_CHAIN_ID: CurrentChainIdModelV010;
  CURRENT_NETWORK_ID: CurrentNetworkIdModelV010;
  SERIALIZED: SerializedModelV010;
  ENCRYPTED_STORED_PASSWORD: EncryptedStoredPasswordModelV010;
  CURRENT_ACCOUNT_ID: CurrentAccountIdModelV010;
  ACCOUNT_NAMES: AccountNamesModelV010;
  ESTABLISH_SITES: EstablishSitesModelV010;
  ADDRESS_BOOK: AddressBookModelV010;
  ACCOUNT_TOKEN_METAINFOS: AccountTokenMetainfoModelV010;
  QUESTIONNAIRE_EXPIRED_DATE: QuestionnaireExpiredDateModelV010;
  WALLET_CREATION_GUIDE_CONFIRM_DATE: WalletCreationGuideConfirmDateModelV010;
  ADD_ACCOUNT_GUIDE_CONFIRM_DATE: AddAccountGuideConfirmDateModelV010;
  ACCOUNT_GRC721_COLLECTIONS: AccountGRC721CollectionsV010;
  ACCOUNT_GRC721_PINNED_PACKAGES: AccountGRC721PinnedPackagesV010;
};

export type NetworksModelV010 = {
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

export type CurrentChainIdModelV010 = string;

export type CurrentNetworkIdModelV010 = string;

export type SerializedModelV010 = string;

export type QuestionnaireExpiredDateModelV010 = number | null;

export type WalletCreationGuideConfirmDateModelV010 = number | null;

export type AddAccountGuideConfirmDateModelV010 = number | null;

export type WalletModelV010 = {
  accounts: AccountDataModelV010[];
  keyrings: KeyringDataModelV010[];
  currentAccountId?: string;
};

type AccountDataModelV010 = {
  id?: string;
  index: number;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP';
  name: string;
  keyringId: string;
  hdPath?: number;
  publicKey: number[];
  addressBytes?: number[];
};

export type KeyringDataModelV010 = {
  id?: string;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP';
  publicKey?: number[];
  privateKey?: number[];
  seed?: number[];
  mnemonic?: string;
  addressBytes?: number[];
};

export type EncryptedStoredPasswordModelV010 = string;

export type CurrentAccountIdModelV010 = string;

type AccountId = string;
type NetworkId = string;

export type AccountNamesModelV010 = { [key in AccountId]: string };

export type EstablishSitesModelV010 = {
  [key in AccountId]: {
    hostname: string;
    chainId: string;
    account: string;
    name: string;
    favicon: string | null;
    establishedTime: string;
  }[];
};

export type AddressBookModelV010 = string;

export type AccountTokenMetainfoModelV010 = {
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

export type AccountGRC721CollectionsV010 = {
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

export type AccountGRC721PinnedPackagesV010 = {
  [key in AccountId]: { [key in NetworkId]: string[] };
};
