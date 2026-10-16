import type {GRC721CollectionModel, GRC721Model} from '@types';

export type OnboardingStackParams = {
  Welcome: undefined;
  CreateMnemonic: undefined;
  ConfirmMnemonic: undefined;
  ImportWallet: undefined;
  /** Which flow led here, for the step dots. */
  SetPassword: {flow: 'create' | 'import'};
};

export type MainStackParams = {
  Home: undefined;
  Receive: undefined;
  Send: {scannedAddress?: string} | undefined;
  SendConfirm:
    | {kind: 'gnot'; to: string; ugnot: string; memo: string}
    | {kind: 'nft'; to: string; token: GRC721Model; memo: string};
  /** Where a scanned address goes back to. */
  QrScan: {returnTo: 'Send' | 'NftSend'};
  Nft: undefined;
  NftCollection: {collection: GRC721CollectionModel};
  NftAsset: {token: GRC721Model};
  ManageNft: undefined;
  NftSend: {token: GRC721Model; scannedAddress?: string};
  Browser: {url?: string} | undefined;
  Settings: undefined;
  Security: undefined;
  AutoLock: undefined;
  ResetWallet: undefined;
  Networks: undefined;
  /** Without `id`, adds a custom network. */
  NetworkEdit: {id?: string} | undefined;
  AddressBook: undefined;
  /** Without `id`, adds an address. */
  AddressEdit: {id?: string} | undefined;
  ChangePassword: undefined;
  RevealMnemonic: undefined;
};
