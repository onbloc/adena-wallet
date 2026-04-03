export type StorageModelV017 = {
  version: 17
  data: StorageModelDataV017
};

export type StorageModelDataV017 = {
  NETWORKS: NetworksModelV017
  CURRENT_CHAIN_ID: CurrentChainIdModelV017
  CURRENT_NETWORK_ID: CurrentNetworkIdModelV017
  SERIALIZED: SerializedModelV017
  ENCRYPTED_STORED_PASSWORD: EncryptedStoredPasswordModelV017
  CURRENT_ACCOUNT_ID: CurrentAccountIdModelV017
  ACCOUNT_NAMES: AccountNamesModelV017
  ESTABLISH_SITES: EstablishSitesModelV017
  ADDRESS_BOOK: AddressBookModelV017
  ACCOUNT_TOKEN_METAINFOS: AccountTokenMetainfoModelV017
  QUESTIONNAIRE_EXPIRED_DATE: QuestionnaireExpiredDateModelV017
  WALLET_CREATION_GUIDE_CONFIRM_DATE: WalletCreationGuideConfirmDateModelV017
  ADD_ACCOUNT_GUIDE_CONFIRM_DATE: AddAccountGuideConfirmDateModelV017
  ACCOUNT_GRC721_COLLECTIONS: AccountGRC721CollectionsV017
  ACCOUNT_GRC721_PINNED_PACKAGES: AccountGRC721PinnedPackagesV017
};

export type NetworksModelV017 = {
  id: string
  default: boolean
  main: boolean
  chainId: string
  chainName: string
  networkId: string
  networkName: string
  addressPrefix: string
  rpcUrl: string
  indexerUrl: string
  gnoUrl: string
  apiUrl: string
  linkUrl: string
  deleted?: boolean
}[];

export type CurrentChainIdModelV017 = string;

export type CurrentNetworkIdModelV017 = string;

export type SerializedModelV017 = string;

export type QuestionnaireExpiredDateModelV017 = number | null;

export type WalletCreationGuideConfirmDateModelV017 = number | null;

export type AddAccountGuideConfirmDateModelV017 = number | null;

export type WalletModelV017 = {
  accounts: AccountDataModelV017[]
  keyrings: KeyringDataModelV017[]
  currentAccountId?: string
};

export type AccountDataModelV017 = {
  id?: string
  index: number
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP'
  name: string
  keyringId: string
  hdPath?: number
  publicKey: number[]
  addressBytes?: number[]
};

export type KeyringDataModelV017 = {
  id?: string
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP'
  publicKey?: number[]
  privateKey?: number[]
  seed?: number[]
  mnemonic?: string
  addressBytes?: number[]
};

export type EncryptedStoredPasswordModelV017 = string;

export type CurrentAccountIdModelV017 = string;

type AccountId = string;
type NetworkId = string;

export type AccountNamesModelV017 = { [key in AccountId]: string };

export type EstablishSitesModelV017 = {
  [key in AccountId]: {
    hostname: string
    chainId: string
    account: string
    name: string
    favicon: string | null
    establishedTime: string
  }[];
};

export type AddressBookModelV017 = string;

export type AccountTokenMetainfoModelV017 = {
  [key in string]: {
    main: boolean
    tokenId: string
    networkId: string
    display: boolean
    type: 'gno-native' | 'grc20' | 'ibc-native' | 'ibc-tokens'
    name: string
    symbol: string
    decimals: number
    description?: string
    websiteUrl?: string
    image: string
    denom?: string
    pkgPath?: string
    originChain?: string
    originDenom?: string
    originType?: string
    path?: string
    channel?: string
    port?: string
  }[];
};

export type AccountGRC721CollectionsV017 = {
  [key in AccountId]: {
    [key in NetworkId]: {
      tokenId: string
      networkId: string
      display: boolean
      type: 'grc721'
      packagePath: string
      name: string
      symbol: string
      image: string | null
      isTokenUri: boolean
      isMetadata: boolean
    }[];
  };
};

export type AccountGRC721PinnedPackagesV017 = {
  [key in AccountId]: { [key in NetworkId]: string[] };
};
