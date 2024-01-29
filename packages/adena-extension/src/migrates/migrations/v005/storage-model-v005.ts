export type StorageModelV005 = {
  version: 5;
  data: StorageModelDataV005;
};

export type StorageModelDataV005 = {
  NETWORKS: NetworksModelV005;
  CURRENT_CHAIN_ID: CurrentChainIdModelV005;
  CURRENT_NETWORK_ID: CurrentNetworkIdModelV005;
  SERIALIZED: SerializedModelV005;
  ENCRYPTED_STORED_PASSWORD: EncryptedStoredPasswordModelV005;
  CURRENT_ACCOUNT_ID: CurrentAccountIdModelV005;
  ACCOUNT_NAMES: AccountNamesModelV005;
  ESTABLISH_SITES: EstablishSitesModelV005;
  ADDRESS_BOOK: AddressBookModelV005;
  ACCOUNT_TOKEN_METAINFOS: AccountTokenMetainfoModelV005;
  QUESTIONNAIRE_EXPIRED_DATE: QuestionnaireExpiredDateModelV005;
};

export type NetworksModelV005 = {
  id: string;
  default: boolean;
  main: boolean;
  chainId: string;
  chainName: string;
  networkId: string;
  networkName: string;
  addressPrefix: string;
  rpcUrl: string;
  gnoUrl: string;
  apiUrl: string;
  linkUrl: string;
  deleted?: boolean;
}[];

export type CurrentChainIdModelV005 = string;

export type CurrentNetworkIdModelV005 = string;

export type SerializedModelV005 = string;

export type QuestionnaireExpiredDateModelV005 = number | null;

export type WalletModelV005 = {
  accounts: AccountDataModelV005[];
  keyrings: KeyringDataModelV005[];
  currentAccountId?: string;
};

type AccountDataModelV005 = {
  id?: string;
  index: number;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP';
  name: string;
  keyringId: string;
  hdPath?: number;
  publicKey: number[];
  addressBytes?: number[];
};

type KeyringDataModelV005 = {
  id?: string;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP';
  publicKey?: number[];
  privateKey?: number[];
  seed?: number[];
  mnemonic?: string;
  addressBytes?: number[];
};

export type EncryptedStoredPasswordModelV005 = string;

export type CurrentAccountIdModelV005 = string;

export type AccountNamesModelV005 = { [key in string]: string };

export type EstablishSitesModelV005 = {
  [key in string]: {
    hostname: string;
    chainId: string;
    account: string;
    name: string;
    favicon: string | null;
    establishedTime: string;
  }[];
};

export type AddressBookModelV005 = {
  id: string;
  name: string;
  address: string;
  createdAt: string;
}[];

export type AccountTokenMetainfoModelV005 = {
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
