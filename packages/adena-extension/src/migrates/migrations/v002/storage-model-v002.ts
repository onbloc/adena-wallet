export type StorageModelV002 = {
  version: 2;
  data: StorageModelDataV002;
};

export type StorageModelDataV002 = {
  NETWORKS: NetworksModelV002;
  CURRENT_CHAIN_ID: CurrentChainIdModelV002;
  CURRENT_NETWORK_ID: CurrentNetworkIdModelV002;
  SERIALIZED: SerializedModelV002;
  ENCRYPTED_STORED_PASSWORD: EncryptedStoredPasswordModelV002;
  CURRENT_ACCOUNT_ID: CurrentAccountIdModelV002;
  ACCOUNT_NAMES: AccountNamesModelV002;
  ESTABLISH_SITES: EstablishSitesModelV002;
  ADDRSS_BOOK: AddressBookModelV002;
  ACCOUNT_TOKEN_METAINFOS: AccountTokenMetainfoModelV002;
};

export type NetworksModelV002 = {
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

export type CurrentChainIdModelV002 = string;

export type CurrentNetworkIdModelV002 = string;

export type SerializedModelV002 = string;

export type WalletModelV002 = {
  accounts: AccountDataModelV002[];
  keyrings: KeyringDataModelV002[];
  currentAccountId?: string;
};

type AccountDataModelV002 = {
  id?: string;
  index: number;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH';
  name: string;
  keyringId: string;
  hdPath?: number;
  publicKey: number[];
};

type KeyringDataModelV002 = {
  id?: string;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH';
  publicKey?: number[];
  privateKey?: number[];
  seed?: number[];
  mnemonic?: string;
};

export type EncryptedStoredPasswordModelV002 = string;

export type CurrentAccountIdModelV002 = string;

export type AccountNamesModelV002 = { [key in string]: string };

export type EstablishSitesModelV002 = {
  [key in string]: {
    hostname: string;
    chainId: string;
    account: string;
    name: string;
    favicon: string | null;
    establishedTime: string;
  }[];
};

export type AddressBookModelV002 = {
  id: string;
  name: string;
  address: string;
  createdAt: string;
}[];

export type AccountTokenMetainfoModelV002 = {
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
