export type StorageModelV016 = {
  version: 16;
  data: StorageModelDataV016;
};

export type StorageModelDataV016 = {
  NETWORKS: NetworksModelV016;
  CURRENT_CHAIN_ID: CurrentChainIdModelV016;
  CURRENT_NETWORK_ID: CurrentNetworkIdModelV016;
  SERIALIZED: SerializedModelV016;
  ENCRYPTED_STORED_PASSWORD: EncryptedStoredPasswordModelV016;
  CURRENT_ACCOUNT_ID: CurrentAccountIdModelV016;
  ACCOUNT_NAMES: AccountNamesModelV016;
  ESTABLISH_SITES: EstablishSitesModelV016;
  ADDRESS_BOOK: AddressBookModelV016;
  ACCOUNT_TOKEN_METAINFOS: AccountTokenMetainfoModelV016;
  QUESTIONNAIRE_EXPIRED_DATE: QuestionnaireExpiredDateModelV016;
  WALLET_CREATION_GUIDE_CONFIRM_DATE: WalletCreationGuideConfirmDateModelV016;
  ADD_ACCOUNT_GUIDE_CONFIRM_DATE: AddAccountGuideConfirmDateModelV016;
  ACCOUNT_GRC721_COLLECTIONS: AccountGRC721CollectionsV016;
  ACCOUNT_GRC721_PINNED_PACKAGES: AccountGRC721PinnedPackagesV016;
};

export type NetworksModelV016 = {
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

export type CurrentChainIdModelV016 = string;

export type CurrentNetworkIdModelV016 = string;

export type SerializedModelV016 = string;

export type QuestionnaireExpiredDateModelV016 = number | null;

export type WalletCreationGuideConfirmDateModelV016 = number | null;

export type AddAccountGuideConfirmDateModelV016 = number | null;

export type WalletModelV016 = {
  accounts: AccountDataModelV016[];
  keyrings: KeyringDataModelV016[];
  currentAccountId?: string;
};

export type AccountDataModelV016 = {
  id?: string;
  index: number;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP';
  name: string;
  keyringId: string;
  hdPath?: number;
  publicKey: number[];
  addressBytes?: number[];
};

export type KeyringDataModelV016 = {
  id?: string;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP';
  publicKey?: number[];
  privateKey?: number[];
  seed?: number[];
  mnemonic?: string;
  addressBytes?: number[];
};

export type EncryptedStoredPasswordModelV016 = string;

export type CurrentAccountIdModelV016 = string;

type AccountId = string;
type NetworkId = string;

export type AccountNamesModelV016 = { [key in AccountId]: string };

export type EstablishSitesModelV016 = {
  [key in AccountId]: {
    hostname: string;
    chainId: string;
    account: string;
    name: string;
    favicon: string | null;
    establishedTime: string;
  }[];
};

export type AddressBookModelV016 = string;

export type AccountTokenMetainfoModelV016 = {
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

export type AccountGRC721CollectionsV016 = {
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

export type AccountGRC721PinnedPackagesV016 = {
  [key in AccountId]: { [key in NetworkId]: string[] };
};
