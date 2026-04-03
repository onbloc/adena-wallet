export type StorageModelV011 = {
  version: 11;
  data: StorageModelDataV011;
};

export type StorageModelDataV011 = {
  NETWORKS: NetworksModelV011;
  CURRENT_CHAIN_ID: CurrentChainIdModelV011;
  CURRENT_NETWORK_ID: CurrentNetworkIdModelV011;
  SERIALIZED: SerializedModelV011;
  ENCRYPTED_STORED_PASSWORD: EncryptedStoredPasswordModelV011;
  CURRENT_ACCOUNT_ID: CurrentAccountIdModelV011;
  ACCOUNT_NAMES: AccountNamesModelV011;
  ESTABLISH_SITES: EstablishSitesModelV011;
  ADDRESS_BOOK: AddressBookModelV011;
  ACCOUNT_TOKEN_METAINFOS: AccountTokenMetainfoModelV011;
  QUESTIONNAIRE_EXPIRED_DATE: QuestionnaireExpiredDateModelV011;
  WALLET_CREATION_GUIDE_CONFIRM_DATE: WalletCreationGuideConfirmDateModelV011;
  ADD_ACCOUNT_GUIDE_CONFIRM_DATE: AddAccountGuideConfirmDateModelV011;
  ACCOUNT_GRC721_COLLECTIONS: AccountGRC721CollectionsV011;
  ACCOUNT_GRC721_PINNED_PACKAGES: AccountGRC721PinnedPackagesV011;
};

export type NetworksModelV011 = {
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

export type CurrentChainIdModelV011 = string;

export type CurrentNetworkIdModelV011 = string;

export type SerializedModelV011 = string;

export type QuestionnaireExpiredDateModelV011 = number | null;

export type WalletCreationGuideConfirmDateModelV011 = number | null;

export type AddAccountGuideConfirmDateModelV011 = number | null;

export type WalletModelV011 = {
  accounts: AccountDataModelV011[];
  keyrings: KeyringDataModelV011[];
  currentAccountId?: string;
};

type AccountDataModelV011 = {
  id?: string;
  index: number;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP';
  name: string;
  keyringId: string;
  hdPath?: number;
  publicKey: number[];
  addressBytes?: number[];
};

export type KeyringDataModelV011 = {
  id?: string;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP';
  publicKey?: number[];
  privateKey?: number[];
  seed?: number[];
  mnemonic?: string;
  addressBytes?: number[];
};

export type EncryptedStoredPasswordModelV011 = string;

export type CurrentAccountIdModelV011 = string;

type AccountId = string;
type NetworkId = string;

export type AccountNamesModelV011 = { [key in AccountId]: string };

export type EstablishSitesModelV011 = {
  [key in AccountId]: {
    hostname: string;
    chainId: string;
    account: string;
    name: string;
    favicon: string | null;
    establishedTime: string;
  }[];
};

export type AddressBookModelV011 = string;

export type AccountTokenMetainfoModelV011 = {
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

export type AccountGRC721CollectionsV011 = {
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

export type AccountGRC721PinnedPackagesV011 = {
  [key in AccountId]: { [key in NetworkId]: string[] };
};
