export type StorageModelV018 = {
  version: 18;
  data: StorageModelDataV018;
};

export type StorageModelDataV018 = {
  NETWORKS: NetworksModelV018;
  CURRENT_CHAIN_ID: CurrentChainIdModelV018;
  CURRENT_NETWORK_ID: CurrentNetworkIdModelV018;
  SERIALIZED: SerializedModelV018;
  ENCRYPTED_STORED_PASSWORD: EncryptedStoredPasswordModelV018;
  CURRENT_ACCOUNT_ID: CurrentAccountIdModelV018;
  ACCOUNT_NAMES: AccountNamesModelV018;
  ESTABLISH_SITES: EstablishSitesModelV018;
  ADDRESS_BOOK: AddressBookModelV018;
  ACCOUNT_TOKEN_METAINFOS: AccountTokenMetainfoModelV018;
  QUESTIONNAIRE_EXPIRED_DATE: QuestionnaireExpiredDateModelV018;
  WALLET_CREATION_GUIDE_CONFIRM_DATE: WalletCreationGuideConfirmDateModelV018;
  ADD_ACCOUNT_GUIDE_CONFIRM_DATE: AddAccountGuideConfirmDateModelV018;
  ACCOUNT_GRC721_COLLECTIONS: AccountGRC721CollectionsV018;
  ACCOUNT_GRC721_PINNED_PACKAGES: AccountGRC721PinnedPackagesV018;
  KDF_SALT: KdfSaltModelV018;
};

// base64-encoded 16-byte random salt for Argon2id KDF
export type KdfSaltModelV018 = string;

export type NetworksModelV018 = {
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

export type CurrentChainIdModelV018 = string;

export type CurrentNetworkIdModelV018 = string;

// SERIALIZED now stores XChaCha20-Poly1305 encrypted data as JSON string:
// '{"ciphertext":"...","nonce":"..."}'
export type SerializedModelV018 = string;

export type QuestionnaireExpiredDateModelV018 = number | null;

export type WalletCreationGuideConfirmDateModelV018 = number | null;

export type AddAccountGuideConfirmDateModelV018 = number | null;

export type WalletModelV018 = {
  accounts: AccountDataModelV018[];
  keyrings: KeyringDataModelV018[];
  currentAccountId?: string;
};

export type AccountDataModelV018 = {
  id?: string;
  index: number;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP';
  name: string;
  keyringId: string;
  hdPath?: number;
  publicKey: number[];
  addressBytes?: number[];
};

export type KeyringDataModelV018 = {
  id?: string;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP';
  publicKey?: number[];
  privateKey?: number[];
  seed?: number[];
  mnemonic?: string;
  addressBytes?: number[];
};

export type EncryptedStoredPasswordModelV018 = string;

export type CurrentAccountIdModelV018 = string;

type AccountId = string;
type NetworkId = string;

export type AccountNamesModelV018 = { [key in AccountId]: string };

export type EstablishSitesModelV018 = {
  [key in AccountId]: {
    hostname: string;
    chainId: string;
    account: string;
    name: string;
    favicon: string | null;
    establishedTime: string;
  }[];
};

export type AddressBookModelV018 = string;

export type AccountTokenMetainfoModelV018 = {
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

export type AccountGRC721CollectionsV018 = {
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

export type AccountGRC721PinnedPackagesV018 = {
  [key in AccountId]: { [key in NetworkId]: string[] };
};
