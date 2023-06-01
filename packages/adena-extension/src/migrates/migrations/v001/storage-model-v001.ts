export type StorageModelV001 = {
  version: 1;
  data: StorageModelDataV001;
};

export type StorageModelDataV001 = {
  NETWORKS: NetworksModelV001;
  CURRENT_CHAIN_ID: CurrentChainIdModelV001;
  CURRENT_NETWORK_ID: CurrentNetworkIdModelV001;
  SERIALIZED: SerializedModelV001;
  ENCRYPTED_STORED_PASSWORD: EncryptedStoredPasswordModelV001;
  CURRENT_ACCOUNT_ID: CurrentAccountIdModelV001;
  ACCOUNT_NAMES: AccountNamesModelV001;
  ESTABLISH_SITES: EstablishSitesModelV001;
  ADDRESS_BOOK: AddressBookModelV001;
  ACCOUNT_TOKEN_METAINFOS: AccountTokenMetainfoModelV001;
};

export type NetworksModelV001 = {
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

export type CurrentChainIdModelV001 = string;

export type CurrentNetworkIdModelV001 = string;

export type SerializedModelV001 = string;

export type WalletModelV001 = {
  accounts: AccountDataModelV001[];
  keyrings: KeyringDataModelV001[];
  currentAccountId?: string;
};

type AccountDataModelV001 = {
  id?: string;
  index: number;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH';
  name: string;
  keyringId: string;
  hdPath?: number;
  publicKey: number[];
};

type KeyringDataModelV001 = {
  id?: string;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH';
  publicKey?: number[];
  privateKey?: number[];
  seed?: number[];
  mnemonic?: string;
};

export type EncryptedStoredPasswordModelV001 = string;

export type CurrentAccountIdModelV001 = string;

export type AccountNamesModelV001 = { [key in string]: string };

export type EstablishSitesModelV001 = {
  [key in string]: {
    hostname: string;
    chainId: string;
    account: string;
    name: string;
    favicon: string | null;
    establishedTime: string;
  }[];
};

export type AddressBookModelV001 = {
  [key in string]: {
    id: string;
    name: string;
    address: string;
    createdAt: string;
  }[];
};

export type AccountTokenMetainfoModelV001 = {
  [key in string]: {
    main: boolean;
    tokenId: string;
    chainId: string;
    networkId: string;
    image?: string;
    pkgPath: string;
    symbol: string;
    type: 'NATIVE' | 'GRC20';
    name: string;
    decimals: number;
    denom: string;
    minimalDenom: string;
    display?: boolean;
  };
};
