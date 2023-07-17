export type StorageModelV003 = {
  version: 2;
  data: StorageModelDataV003;
};

export type StorageModelDataV003 = {
  NETWORKS: NetworksModelV003;
  CURRENT_CHAIN_ID: CurrentChainIdModelV003;
  CURRENT_NETWORK_ID: CurrentNetworkIdModelV003;
  SERIALIZED: SerializedModelV003;
  ENCRYPTED_STORED_PASSWORD: EncryptedStoredPasswordModelV003;
  CURRENT_ACCOUNT_ID: CurrentAccountIdModelV003;
  ACCOUNT_NAMES: AccountNamesModelV003;
  ESTABLISH_SITES: EstablishSitesModelV003;
  ADDRESS_BOOK: AddressBookModelV003;
  ACCOUNT_TOKEN_METAINFOS: AccountTokenMetainfoModelV003;
};

export type NetworksModelV003 = {
  id: string;
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
  token: {
    denom: string;
    unit: number;
    minimalDenom: string;
    minimalUnit: number;
  };
}[];

export type CurrentChainIdModelV003 = string;

export type CurrentNetworkIdModelV003 = string;

export type SerializedModelV003 = string;

export type WalletModelV003 = {
  accounts: AccountDataModelV003[];
  keyrings: KeyringDataModelV003[];
  currentAccountId?: string;
};

type AccountDataModelV003 = {
  id?: string;
  index: number;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH';
  name: string;
  keyringId: string;
  hdPath?: number;
  publicKey: number[];
};

type KeyringDataModelV003 = {
  id?: string;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH';
  publicKey?: number[];
  privateKey?: number[];
  seed?: number[];
  mnemonic?: string;
};

export type EncryptedStoredPasswordModelV003 = string;

export type CurrentAccountIdModelV003 = string;

export type AccountNamesModelV003 = { [key in string]: string };

export type EstablishSitesModelV003 = {
  [key in string]: {
    hostname: string;
    chainId: string;
    account: string;
    name: string;
    favicon: string | null;
    establishedTime: string;
  }[];
};

export type AddressBookModelV003 = {
  id: string;
  name: string;
  address: string;
  createdAt: string;
}[];

export type AccountTokenMetainfoModelV003 = {
  [key in string]: {
    main: boolean;
    tokenId: string;
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
