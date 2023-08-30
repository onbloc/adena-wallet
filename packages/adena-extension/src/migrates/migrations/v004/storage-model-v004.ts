export type StorageModelV004 = {
  version: 4;
  data: StorageModelDataV004;
};

export type StorageModelDataV004 = {
  NETWORKS: NetworksModelV004;
  CURRENT_CHAIN_ID: CurrentChainIdModelV004;
  CURRENT_NETWORK_ID: CurrentNetworkIdModelV004;
  SERIALIZED: SerializedModelV004;
  ENCRYPTED_STORED_PASSWORD: EncryptedStoredPasswordModelV004;
  CURRENT_ACCOUNT_ID: CurrentAccountIdModelV004;
  ACCOUNT_NAMES: AccountNamesModelV004;
  ESTABLISH_SITES: EstablishSitesModelV004;
  ADDRESS_BOOK: AddressBookModelV004;
  ACCOUNT_TOKEN_METAINFOS: AccountTokenMetainfoModelV004;
};

export type NetworksModelV004 = {
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

export type CurrentChainIdModelV004 = string;

export type CurrentNetworkIdModelV004 = string;

export type SerializedModelV004 = string;

export type WalletModelV004 = {
  accounts: AccountDataModelV004[];
  keyrings: KeyringDataModelV004[];
  currentAccountId?: string;
};

type AccountDataModelV004 = {
  id?: string;
  index: number;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH';
  name: string;
  keyringId: string;
  hdPath?: number;
  publicKey: number[];
};

type KeyringDataModelV004 = {
  id?: string;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH';
  publicKey?: number[];
  privateKey?: number[];
  seed?: number[];
  mnemonic?: string;
};

export type EncryptedStoredPasswordModelV004 = string;

export type CurrentAccountIdModelV004 = string;

export type AccountNamesModelV004 = { [key in string]: string };

export type EstablishSitesModelV004 = {
  [key in string]: {
    hostname: string;
    chainId: string;
    account: string;
    name: string;
    favicon: string | null;
    establishedTime: string;
  }[];
};

export type AddressBookModelV004 = {
  id: string;
  name: string;
  address: string;
  createdAt: string;
}[];

export type AccountTokenMetainfoModelV004 = {
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
