export type StorageModelV006 = {
  version: 6;
  data: StorageModelDataV006;
};

export type StorageModelDataV006 = {
  NETWORKS: NetworksModelV006;
  CURRENT_CHAIN_ID: CurrentChainIdModelV006;
  CURRENT_NETWORK_ID: CurrentNetworkIdModelV006;
  SERIALIZED: SerializedModelV006;
  ENCRYPTED_STORED_PASSWORD: EncryptedStoredPasswordModelV006;
  CURRENT_ACCOUNT_ID: CurrentAccountIdModelV006;
  ACCOUNT_NAMES: AccountNamesModelV006;
  ESTABLISH_SITES: EstablishSitesModelV006;
  ADDRESS_BOOK: AddressBookModelV006;
  ACCOUNT_TOKEN_METAINFOS: AccountTokenMetainfoModelV006;
  QUESTIONNAIRE_EXPIRED_DATE: QuestionnaireExpiredDateModelV006;
  WALLET_CREATION_GUIDE_CONFIRM_DATE: WalletCreationGuideConfirmDateModelV006;
  ADD_ACCOUNT_GUIDE_CONFIRM_DATE: AddAccountGuideConfirmDateModelV006;
};

export type NetworksModelV006 = {
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

export type CurrentChainIdModelV006 = string;

export type CurrentNetworkIdModelV006 = string;

export type SerializedModelV006 = string;

export type QuestionnaireExpiredDateModelV006 = number | null;

export type WalletCreationGuideConfirmDateModelV006 = number | null;

export type AddAccountGuideConfirmDateModelV006 = number | null;

export type WalletModelV006 = {
  accounts: AccountDataModelV006[];
  keyrings: KeyringDataModelV006[];
  currentAccountId?: string;
};

type AccountDataModelV006 = {
  id?: string;
  index: number;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP';
  name: string;
  keyringId: string;
  hdPath?: number;
  publicKey: number[];
  addressBytes?: number[];
};

type KeyringDataModelV006 = {
  id?: string;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP';
  publicKey?: number[];
  privateKey?: number[];
  seed?: number[];
  mnemonic?: string;
  addressBytes?: number[];
};

export type EncryptedStoredPasswordModelV006 = string;

export type CurrentAccountIdModelV006 = string;

export type AccountNamesModelV006 = { [key in string]: string };

export type EstablishSitesModelV006 = {
  [key in string]: {
    hostname: string;
    chainId: string;
    account: string;
    name: string;
    favicon: string | null;
    establishedTime: string;
  }[];
};

export type AddressBookModelV006 = string;

export type AccountTokenMetainfoModelV006 = {
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
