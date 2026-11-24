import { NavigatorScreenParams } from '@react-navigation/native';

import { SecretImportMode } from '../domain/account';
import { Activity } from '../domain/activity';
import { AddressBookEntry } from '../domain/address-book';
import { NftCollection, NftItem } from '../domain/nft';

export type OnboardingStackParamList = {
  Welcome: undefined;
  BackupPhrase: undefined;
  ImportWallet: undefined;
  CreatePassword: undefined;
};

export type LockedStackParamList = {
  Unlock: undefined;
  ResetWallet: undefined;
};

// Root tabs are siblings; switching tabs never pushes onto the stack.
export type MainTabParamList = {
  Wallet: undefined;
  Explore: undefined;
  Activity: undefined;
};

export type MainStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  ManageNfts: undefined;
  SendNft: { collection: NftCollection; item: NftItem };
  AddressBook: undefined;
  AddressBookEdit: { entry?: AddressBookEntry } | undefined;
  ResetWallet: undefined;
  ActivityDetail: { activity: Activity };
  TokenDetails: { tokenId: string };
  ManageTokens: undefined;
  AddToken: undefined;
  NftCollection: { collection: NftCollection };
  NftDetail: { collection: NftCollection; item: NftItem };
  Accounts: undefined;
  ImportAccount: { mode: SecretImportMode };
  AccountSettings: { accountId: string };
  SendRecipient: { tokenId?: string } | undefined;
  SendAmount: { toAddress: string; tokenId?: string };
  Receive: undefined;
  Settings: undefined;
  RecoveryPhrase: { keyringId: string };
  ChangePassword: undefined;
  ConnectedApps: undefined;
  Networks: undefined;
  AddNetwork: undefined;
  DappRequest: undefined;
};
