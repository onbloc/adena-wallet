export type StorageModelV013 = {
  version: 13;
  data: StorageModelDataV013;
};

export type StorageModelDataV013 = {
  NETWORKS: NetworksModelV013;
  CURRENT_CHAIN_ID: CurrentChainIdModelV013;
  CURRENT_NETWORK_ID: CurrentNetworkIdModelV013;
  SERIALIZED: SerializedModelV013;
  ENCRYPTED_STORED_PASSWORD: EncryptedStoredPasswordModelV013;
  CURRENT_ACCOUNT_ID: CurrentAccountIdModelV013;
  ACCOUNT_NAMES: AccountNamesModelV013;
  ESTABLISH_SITES: EstablishSitesModelV013;
  ADDRESS_BOOK: AddressBookModelV013;
  ACCOUNT_TOKEN_METAINFOS: AccountTokenMetainfoModelV013;
  QUESTIONNAIRE_EXPIRED_DATE: QuestionnaireExpiredDateModelV013;
  WALLET_CREATION_GUIDE_CONFIRM_DATE: WalletCreationGuideConfirmDateModelV013;
  ADD_ACCOUNT_GUIDE_CONFIRM_DATE: AddAccountGuideConfirmDateModelV013;
  ACCOUNT_GRC721_COLLECTIONS: AccountGRC721CollectionsV013;
  ACCOUNT_GRC721_PINNED_PACKAGES: AccountGRC721PinnedPackagesV013;
};

export type NetworksModelV013 = {
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

export type CurrentChainIdModelV013 = string;

export type CurrentNetworkIdModelV013 = string;

export type SerializedModelV013 = string;

export type QuestionnaireExpiredDateModelV013 = number | null;

export type WalletCreationGuideConfirmDateModelV013 = number | null;

export type AddAccountGuideConfirmDateModelV013 = number | null;

export type WalletModelV013 = {
  accounts: AccountDataModelV013[];
  keyrings: KeyringDataModelV013[];
  currentAccountId?: string;
};

type AccountDataModelV013 = {
  id?: string;
  index: number;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP';
  name: string;
  keyringId: string;
  hdPath?: number;
  publicKey: number[];
  addressBytes?: number[];
};

export type KeyringDataModelV013 = {
  id?: string;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP';
  publicKey?: number[];
  privateKey?: number[];
  seed?: number[];
  mnemonic?: string;
  addressBytes?: number[];
};

export type EncryptedStoredPasswordModelV013 = string;

export type CurrentAccountIdModelV013 = string;

type AccountId = string;
type NetworkId = string;

export type AccountNamesModelV013 = { [key in AccountId]: string };

export type EstablishSitesModelV013 = {
  [key in AccountId]: {
    hostname: string;
    chainId: string;
    account: string;
    name: string;
    favicon: string | null;
    establishedTime: string;
  }[];
};

export type AddressBookModelV013 = string;

export type AccountTokenMetainfoModelV013 = {
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

export type AccountGRC721CollectionsV013 = {
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

export type AccountGRC721PinnedPackagesV013 = {
  [key in AccountId]: { [key in NetworkId]: string[] };
};
