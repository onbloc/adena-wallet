import { MultisigConfig, SignerPublicKeyInfo } from 'adena-module';

export type StorageModelV015 = {
  version: 15;
  data: StorageModelDataV015;
};

export type StorageModelDataV015 = {
  NETWORKS: NetworksModelV015;
  CURRENT_CHAIN_ID: CurrentChainIdModelV015;
  CURRENT_NETWORK_ID: CurrentNetworkIdModelV015;
  SERIALIZED: SerializedModelV015;
  ENCRYPTED_STORED_PASSWORD: EncryptedStoredPasswordModelV015;
  CURRENT_ACCOUNT_ID: CurrentAccountIdModelV015;
  ACCOUNT_NAMES: AccountNamesModelV015;
  ESTABLISH_SITES: EstablishSitesModelV015;
  ADDRESS_BOOK: AddressBookModelV015;
  ACCOUNT_TOKEN_METAINFOS: AccountTokenMetainfoModelV015;
  QUESTIONNAIRE_EXPIRED_DATE: QuestionnaireExpiredDateModelV015;
  WALLET_CREATION_GUIDE_CONFIRM_DATE: WalletCreationGuideConfirmDateModelV015;
  ADD_ACCOUNT_GUIDE_CONFIRM_DATE: AddAccountGuideConfirmDateModelV015;
  ACCOUNT_GRC721_COLLECTIONS: AccountGRC721CollectionsV015;
  ACCOUNT_GRC721_PINNED_PACKAGES: AccountGRC721PinnedPackagesV015;
};

export type NetworksModelV015 = {
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

export type CurrentChainIdModelV015 = string;

export type CurrentNetworkIdModelV015 = string;

export type SerializedModelV015 = string;

export type QuestionnaireExpiredDateModelV015 = number | null;

export type WalletCreationGuideConfirmDateModelV015 = number | null;

export type AddAccountGuideConfirmDateModelV015 = number | null;

export type WalletModelV015 = {
  accounts: AccountDataModelV015[];
  keyrings: KeyringDataModelV015[];
  currentAccountId?: string;
};

export type AccountDataModelV015 = {
  id?: string;
  index: number;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP' | 'MULTISIG';
  name: string;
  keyringId: string;
  hdPath?: number;
  publicKey: number[];
  addressBytes?: number[];
  multisigConfig?: MultisigConfig;
  signerPublicKeys?: SignerPublicKeyInfo[];
};

export type KeyringDataModelV015 = {
  id?: string;
  type: 'HD_WALLET' | 'PRIVATE_KEY' | 'LEDGER' | 'WEB3_AUTH' | 'AIRGAP' | 'MULTISIG';
  publicKey?: number[];
  privateKey?: number[];
  seed?: number[];
  mnemonic?: string;
  addressBytes?: number[];
  multsigConfig?: MultisigConfig;
  signerPublicKeys?: SignerPublicKeyInfo[];
};

export type EncryptedStoredPasswordModelV015 = string;

export type CurrentAccountIdModelV015 = string;

type AccountId = string;
type NetworkId = string;

export type AccountNamesModelV015 = { [key in AccountId]: string };

export type EstablishSitesModelV015 = {
  [key in AccountId]: {
    hostname: string;
    chainId: string;
    account: string;
    name: string;
    favicon: string | null;
    establishedTime: string;
  }[];
};

export type AddressBookModelV015 = string;

export type AccountTokenMetainfoModelV015 = {
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

export type AccountGRC721CollectionsV015 = {
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

export type AccountGRC721PinnedPackagesV015 = {
  [key in AccountId]: { [key in NetworkId]: string[] };
};
