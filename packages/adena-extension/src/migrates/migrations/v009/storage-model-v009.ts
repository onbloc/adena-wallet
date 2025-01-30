export type StorageModelV009 = {
  version: 9;
  data: StorageModelDataV009;
};

export type StorageModelDataV009 = {
  NETWORKS: NetworksModelV009;
  CURRENT_CHAIN_ID: CurrentChainIdModelV009;
  CURRENT_NETWORK_ID: CurrentNetworkIdModelV009;
  SERIALIZED: SerializedModelV009;
  ENCRYPTED_STORED_PASSWORD: EncryptedStoredPasswordModelV009;
  CURRENT_ACCOUNT_ID: CurrentAccountIdModelV009;
  ACCOUNT_NAMES: AccountNamesModelV009;
  ESTABLISH_SITES: EstablishSitesModelV009;
  ADDRESS_BOOK: AddressBookModelV009;
  ACCOUNT_TOKEN_METAINFOS: AccountTokenMetainfoModelV009;
  QUESTIONNAIRE_EXPIRED_DATE: QuestionnaireExpiredDateModelV009;
  WALLET_CREATION_GUIDE_CONFIRM_DATE: WalletCreationGuideConfirmDateModelV009;
  ADD_ACCOUNT_GUIDE_CONFIRM_DATE: AddAccountGuideConfirmDateModelV009;
  ACCOUNT_GRC721_COLLECTIONS: AccountGRC721CollectionsV009;
  ACCOUNT_GRC721_PINNED_PACKAGES: AccountGRC721PinnedPackagesV009;
};

export type NetworksModelV009 = {
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

export type CurrentChainIdModelV009 = string;

export type CurrentNetworkIdModelV009 = string;

export type SerializedModelV009 = string;

export type QuestionnaireExpiredDateModelV009 = number | null;

export type WalletCreationGuideConfirmDateModelV009 = number | null;

export type AddAccountGuideConfirmDateModelV009 = number | null;

export type WalletModelV009 = {
  accounts: AccountDataModelV009[];
  keyrings: KeyringDataModelV009[];
  currentAccountId?: string;
};

type AccountDataModelV009 = {
  id?: string;
  index: number;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP';
  name: string;
  keyringId: string;
  hdPath?: number;
  publicKey: number[];
  addressBytes?: number[];
};

type KeyringDataModelV009 = {
  id?: string;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP';
  publicKey?: number[];
  privateKey?: number[];
  seed?: number[];
  mnemonicEntropy?: number[];
  addressBytes?: number[];
};

export type EncryptedStoredPasswordModelV009 = string;

export type CurrentAccountIdModelV009 = string;

type AccountId = string;
type NetworkId = string;

export type AccountNamesModelV009 = { [key in AccountId]: string };

export type EstablishSitesModelV009 = {
  [key in AccountId]: {
    hostname: string;
    chainId: string;
    account: string;
    name: string;
    favicon: string | null;
    establishedTime: string;
  }[];
};

export type AddressBookModelV009 = string;

export type AccountTokenMetainfoModelV009 = {
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

export type AccountGRC721CollectionsV009 = {
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

export type AccountGRC721PinnedPackagesV009 = {
  [key in AccountId]: { [key in NetworkId]: string[] };
};
