export type StorageModelV019 = {
  version: 19;
  data: StorageModelDataV019;
};

export type StorageModelDataV019 = {
  NETWORKS: NetworksModelV019;
  CURRENT_CHAIN_ID: CurrentChainIdModelV019;
  CURRENT_NETWORK_ID: CurrentNetworkIdModelV019;
  SERIALIZED: SerializedModelV019;
  ENCRYPTED_STORED_PASSWORD: EncryptedStoredPasswordModelV019;
  CURRENT_ACCOUNT_ID: CurrentAccountIdModelV019;
  ACCOUNT_NAMES: AccountNamesModelV019;
  ESTABLISH_SITES: EstablishSitesModelV019;
  ADDRESS_BOOK: AddressBookModelV019;
  ACCOUNT_TOKEN_METAINFOS: AccountTokenMetainfoModelV019;
  QUESTIONNAIRE_EXPIRED_DATE: QuestionnaireExpiredDateModelV019;
  WALLET_CREATION_GUIDE_CONFIRM_DATE: WalletCreationGuideConfirmDateModelV019;
  ADD_ACCOUNT_GUIDE_CONFIRM_DATE: AddAccountGuideConfirmDateModelV019;
  ACCOUNT_GRC721_COLLECTIONS: AccountGRC721CollectionsV019;
  ACCOUNT_GRC721_PINNED_PACKAGES: AccountGRC721PinnedPackagesV019;
  KDF_SALT: KdfSaltModelV019;
};

export type KdfSaltModelV019 = string;

export type NetworksModelV019 = {
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

export type CurrentChainIdModelV019 = string;

export type CurrentNetworkIdModelV019 = string;

export type SerializedModelV019 = string;

export type QuestionnaireExpiredDateModelV019 = number | null;

export type WalletCreationGuideConfirmDateModelV019 = number | null;

export type AddAccountGuideConfirmDateModelV019 = number | null;

export type WalletModelV019 = {
  accounts: AccountDataModelV019[];
  keyrings: KeyringDataModelV019[];
  currentAccountId?: string;
};

export type AccountDataModelV019 = {
  id?: string;
  index: number;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP';
  name: string;
  keyringId: string;
  hdPath?: number;
  publicKey: number[];
  addressBytes?: number[];
};

export type KeyringDataModelV019 = {
  id?: string;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP';
  publicKey?: number[];
  privateKey?: number[];
  seed?: number[];
  mnemonic?: string;
  addressBytes?: number[];
};

export type EncryptedStoredPasswordModelV019 = string;

export type CurrentAccountIdModelV019 = string;

type AccountId = string;
type NetworkId = string;

export type AccountNamesModelV019 = { [key in AccountId]: string };

export type EstablishSitesModelV019 = {
  [key in AccountId]: {
    hostname: string;
    chainId: string;
    account: string;
    name: string;
    favicon: string | null;
    establishedTime: string;
  }[];
};

export type AddressBookModelV019 = string;

export type AccountTokenMetainfoModelV019 = {
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

export type AccountGRC721CollectionsV019 = {
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

export type AccountGRC721PinnedPackagesV019 = {
  [key in AccountId]: { [key in NetworkId]: string[] };
};
