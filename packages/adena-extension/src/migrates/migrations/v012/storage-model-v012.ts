export type StorageModelV012 = {
  version: 12;
  data: StorageModelDataV012;
};

export type StorageModelDataV012 = {
  NETWORKS: NetworksModelV012;
  CURRENT_CHAIN_ID: CurrentChainIdModelV012;
  CURRENT_NETWORK_ID: CurrentNetworkIdModelV012;
  SERIALIZED: SerializedModelV012;
  ENCRYPTED_STORED_PASSWORD: EncryptedStoredPasswordModelV012;
  CURRENT_ACCOUNT_ID: CurrentAccountIdModelV012;
  ACCOUNT_NAMES: AccountNamesModelV012;
  ESTABLISH_SITES: EstablishSitesModelV012;
  ADDRESS_BOOK: AddressBookModelV012;
  ACCOUNT_TOKEN_METAINFOS: AccountTokenMetainfoModelV012;
  QUESTIONNAIRE_EXPIRED_DATE: QuestionnaireExpiredDateModelV012;
  WALLET_CREATION_GUIDE_CONFIRM_DATE: WalletCreationGuideConfirmDateModelV012;
  ADD_ACCOUNT_GUIDE_CONFIRM_DATE: AddAccountGuideConfirmDateModelV012;
  ACCOUNT_GRC721_COLLECTIONS: AccountGRC721CollectionsV012;
  ACCOUNT_GRC721_PINNED_PACKAGES: AccountGRC721PinnedPackagesV012;
};

export type NetworksModelV012 = {
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

export type CurrentChainIdModelV012 = string;

export type CurrentNetworkIdModelV012 = string;

export type SerializedModelV012 = string;

export type QuestionnaireExpiredDateModelV012 = number | null;

export type WalletCreationGuideConfirmDateModelV012 = number | null;

export type AddAccountGuideConfirmDateModelV012 = number | null;

export type WalletModelV012 = {
  accounts: AccountDataModelV012[];
  keyrings: KeyringDataModelV012[];
  currentAccountId?: string;
};

type AccountDataModelV012 = {
  id?: string;
  index: number;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP';
  name: string;
  keyringId: string;
  hdPath?: number;
  publicKey: number[];
  addressBytes?: number[];
};

export type KeyringDataModelV012 = {
  id?: string;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP';
  publicKey?: number[];
  privateKey?: number[];
  seed?: number[];
  mnemonic?: string;
  addressBytes?: number[];
};

export type EncryptedStoredPasswordModelV012 = string;

export type CurrentAccountIdModelV012 = string;

type AccountId = string;
type NetworkId = string;

export type AccountNamesModelV012 = { [key in AccountId]: string };

export type EstablishSitesModelV012 = {
  [key in AccountId]: {
    hostname: string;
    chainId: string;
    account: string;
    name: string;
    favicon: string | null;
    establishedTime: string;
  }[];
};

export type AddressBookModelV012 = string;

export type AccountTokenMetainfoModelV012 = {
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

export type AccountGRC721CollectionsV012 = {
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

export type AccountGRC721PinnedPackagesV012 = {
  [key in AccountId]: { [key in NetworkId]: string[] };
};
