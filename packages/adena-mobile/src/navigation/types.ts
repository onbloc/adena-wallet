import { NavigatorScreenParams } from '@react-navigation/native';

import type { SheetRouteParams } from '../components/molecules/bottom-sheet';
import { SecretImportMode } from '../domain/account';
import { Activity } from '../domain/activity';
import { AddressBookEntry } from '../domain/address-book';
import { NftCollection, NftItem } from '../domain/nft';

// Create: Welcome > BackupMethod > (BackupPhrase | BackupPassword)? > ProtectWallet > CreatePassword.
// Import: Welcome > ImportMethod? > ImportWallet > SelectAccounts > ProtectWallet > CreatePassword,
// or ImportMethod > RestoreBackup > ProtectWallet > CreatePassword.
export type OnboardingStackParamList = {
  Welcome: undefined;
  BackupMethod: undefined;
  BackupPhrase: undefined;
  BackupPassword: undefined;
  ImportMethod: undefined;
  ImportWallet: undefined;
  SelectAccounts: undefined;
  ProtectWallet: undefined;
  CreatePassword: undefined;
  RestoreBackup: undefined;
  Sheet: SheetRouteParams;
};

export type LockedStackParamList = {
  Splash: undefined;
  // `error` explains why the splash's biometric attempt fell back to the password.
  Unlock: { error?: string } | undefined;
  ResetWallet: undefined;
  Sheet: SheetRouteParams;
};

// Root tabs are siblings; switching tabs never pushes onto the stack.
export type MainTabParamList = {
  Wallet: undefined;
  Activity: undefined;
};

export type MainStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  ManageNfts: undefined;
  SendNft: { collection: NftCollection; item: NftItem; scannedAddress?: string };
  AddressBook: undefined;
  AddressBookEdit: { entry?: AddressBookEntry } | undefined;
  ResetWallet: undefined;
  ActivityDetail: { activity: Activity };
  TokenDetails: { tokenId: string };
  ManageTokens: undefined;
  // `query` prefills the registry search (e.g. from a Search result that is not in the wallet yet).
  AddToken: { query?: string } | undefined;
  NftCollection: { collection: NftCollection };
  NftDetail: { collection: NftCollection; item: NftItem };
  Accounts: undefined;
  ImportAccount: { mode: SecretImportMode };
  AccountSettings: { accountId: string };
  EditProfile: { accountId: string };
  SendRecipient: { tokenId?: string; scannedAddress?: string } | undefined;
  SendAmount: { toAddress: string; tokenId?: string };
  Receive: undefined;
  // With a return key the scanned address is written back as `scannedAddress` on that route;
  // without one the scanner continues to the send flow.
  QrScanner: { returnKey?: string } | undefined;
  Settings: undefined;
  RecoveryPhrase: { keyringId: string };
  ChangePassword: undefined;
  CloudBackup: undefined;
  ConnectedApps: undefined;
  Networks: undefined;
  AddNetwork: undefined;
  DappRequest: undefined;
  Search: undefined;
  BuyCrypto: { tokenId?: string } | undefined;
  // `amount` is the fiat amount in USD as a plain decimal string.
  Checkout: { tokenId: string; amount: string };
  // Generic native sheet route used by BottomSheet.
  Sheet: SheetRouteParams;
  // `inputTokenId` preselects the token to sell (e.g. from token details).
  Swap: { inputTokenId?: string } | undefined;
};
