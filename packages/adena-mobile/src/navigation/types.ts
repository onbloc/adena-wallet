import type {
  GRC20TokenModel,
  GRC721CollectionModel,
  GRC721Model,
  TransactionInfo,
} from '@types';

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
  /** Without `tokenId`, sends GNOT. */
  Send: {tokenId?: string; scannedAddress?: string} | undefined;
  SelectToken: undefined;
  History: undefined;
  Explore: undefined;
  TransactionDetail: {transaction: TransactionInfo};
  TokenDetails: {tokenId: string};
  ManageTokens: undefined;
  AddToken: undefined;
  SendConfirm:
    | {kind: 'gnot'; to: string; ugnot: string; memo: string}
    | {kind: 'nft'; to: string; token: GRC721Model; memo: string}
    | {
        kind: 'grc20';
        to: string;
        token: GRC20TokenModel;
        /** In the token's smallest unit. */
        rawAmount: string;
        memo: string;
      };
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
  Accounts: undefined;
  AccountDetails: {accountId: string};
  /** Add Account flows; the step dots carry over to the next screen. */
  AddSeedPhrase: undefined;
  AddSeedPhraseConfirm: {step: number; steps: number};
  ImportAccount: undefined;
  SelectImportAccounts: {step: number; steps: number};
  AddressBook: undefined;
  /** Without `id`, adds an address. */
  AddressEdit: {id?: string} | undefined;
  ChangePassword: undefined;
  RevealMnemonic: undefined;
};
