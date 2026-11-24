import { createNativeStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import React, { ReactElement, useMemo } from 'react';

import { AccountSettingsScreen } from '../containers/main/account-settings-screen';
import { AccountsScreen } from '../containers/main/accounts-screen';
import { ActivityDetailScreen } from '../containers/main/activity-detail-screen';
import { AddNetworkScreen } from '../containers/main/add-network-screen';
import { AddTokenScreen } from '../containers/main/add-token-screen';
import { AddressBookEditScreen } from '../containers/main/address-book-edit-screen';
import { AddressBookScreen } from '../containers/main/address-book-screen';
import { BuyCryptoScreen } from '../containers/main/buy-crypto-screen';
import { ChangePasswordScreen } from '../containers/main/change-password-screen';
import { CheckoutScreen } from '../containers/main/checkout-screen';
import { ConnectedAppsScreen } from '../containers/main/connected-apps-screen';
import { EditProfileScreen } from '../containers/main/edit-profile-screen';
import { ImportAccountScreen } from '../containers/main/import-account-screen';
import { ManageNftsScreen } from '../containers/main/manage-nfts-screen';
import { ManageTokensScreen } from '../containers/main/manage-tokens-screen';
import { NetworksScreen } from '../containers/main/networks-screen';
import { NftCollectionScreen } from '../containers/main/nft-collection-screen';
import { NftDetailScreen } from '../containers/main/nft-detail-screen';
import { QrScannerScreen } from '../containers/main/qr-scanner-screen';
import { ReceiveScreen } from '../containers/main/receive-screen';
import { RecoveryPhraseScreen } from '../containers/main/recovery-phrase-screen';
import { SearchScreen } from '../containers/main/search-screen';
import { SendAmountScreen } from '../containers/main/send-amount-screen';
import { SendNftScreen } from '../containers/main/send-nft-screen';
import { SendRecipientScreen } from '../containers/main/send-recipient-screen';
import { SettingsScreen } from '../containers/main/settings-screen';
import { TokenDetailsScreen } from '../containers/main/token-details-screen';
import { BackupPhraseScreen } from '../containers/onboarding/backup-phrase-screen';
import { CreatePasswordScreen } from '../containers/onboarding/create-password-screen';
import { ImportWalletScreen } from '../containers/onboarding/import-wallet-screen';
import { WelcomeScreen } from '../containers/onboarding/welcome-screen';
import { ResetWalletScreen } from '../containers/reset-wallet-screen';
import { UnlockScreen } from '../containers/unlock-screen';
import { SessionStatus, useSessionStore } from '../stores/session.store';
import { motion, useThemeColors } from '../theme';
import { MainTabs } from './main-tabs';
import { LockedStackParamList, MainStackParamList, OnboardingStackParamList } from './types';

const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const LockedStack = createNativeStackNavigator<LockedStackParamList>();

const useScreenOptions = (): NativeStackNavigationOptions => {
  const canvas = useThemeColors().background.canvas;

  return useMemo(() => ({ headerShown: false, contentStyle: { backgroundColor: canvas }, animationDuration: motion.transition }), [canvas]);
};

const OnboardingNavigator = (): ReactElement => {
  const screenOptions = useScreenOptions();

  return (
    <OnboardingStack.Navigator screenOptions={screenOptions}>
      <OnboardingStack.Screen name='Welcome' component={WelcomeScreen} />
      <OnboardingStack.Screen name='BackupPhrase' component={BackupPhraseScreen} />
      <OnboardingStack.Screen name='ImportWallet' component={ImportWalletScreen} />
      <OnboardingStack.Screen name='CreatePassword' component={CreatePasswordScreen} />
    </OnboardingStack.Navigator>
  );
};

const LockedNavigator = (): ReactElement => {
  const screenOptions = useScreenOptions();

  return (
    <LockedStack.Navigator screenOptions={screenOptions}>
      <LockedStack.Screen name='Unlock' component={UnlockScreen} />
      <LockedStack.Screen name='ResetWallet' component={ResetWalletScreen} />
    </LockedStack.Navigator>
  );
};

const MainNavigator = (): ReactElement => {
  const screenOptions = useScreenOptions();

  return (
    <MainStack.Navigator screenOptions={screenOptions}>
      <MainStack.Screen name='Main' component={MainTabs} />
      <MainStack.Screen name='ManageNfts' component={ManageNftsScreen} />
      <MainStack.Screen name='SendNft' component={SendNftScreen} />
      <MainStack.Screen name='AddressBook' component={AddressBookScreen} />
      <MainStack.Screen name='AddressBookEdit' component={AddressBookEditScreen} />
      <MainStack.Screen name='ResetWallet' component={ResetWalletScreen} />
      <MainStack.Screen name='ActivityDetail' component={ActivityDetailScreen} />
      <MainStack.Screen name='TokenDetails' component={TokenDetailsScreen} />
      <MainStack.Screen name='ManageTokens' component={ManageTokensScreen} />
      <MainStack.Screen name='AddToken' component={AddTokenScreen} />
      <MainStack.Screen name='NftCollection' component={NftCollectionScreen} />
      <MainStack.Screen name='NftDetail' component={NftDetailScreen} />
      <MainStack.Screen name='Accounts' component={AccountsScreen} />
      <MainStack.Screen name='ImportAccount' component={ImportAccountScreen} />
      <MainStack.Screen name='AccountSettings' component={AccountSettingsScreen} />
      <MainStack.Screen name='EditProfile' component={EditProfileScreen} />
      <MainStack.Screen name='SendRecipient' component={SendRecipientScreen} options={{ presentation: 'modal' }} />
      <MainStack.Screen name='SendAmount' component={SendAmountScreen} />
      <MainStack.Screen
        name='Receive'
        component={ReceiveScreen}
        options={{ presentation: 'transparentModal', animation: 'none', contentStyle: { backgroundColor: 'transparent' } }}
      />
      <MainStack.Screen name='QrScanner' component={QrScannerScreen} options={{ presentation: 'fullScreenModal' }} />
      <MainStack.Screen name='Settings' component={SettingsScreen} />
      <MainStack.Screen name='RecoveryPhrase' component={RecoveryPhraseScreen} />
      <MainStack.Screen name='ChangePassword' component={ChangePasswordScreen} />
      <MainStack.Screen name='ConnectedApps' component={ConnectedAppsScreen} />
      <MainStack.Screen name='Networks' component={NetworksScreen} />
      <MainStack.Screen name='AddNetwork' component={AddNetworkScreen} />
      <MainStack.Screen name='Search' component={SearchScreen} />
      <MainStack.Screen name='BuyCrypto' component={BuyCryptoScreen} />
      <MainStack.Screen name='Checkout' component={CheckoutScreen} />
    </MainStack.Navigator>
  );
};

// The session status decides which stack exists, so locked screens are never mounted behind the unlock page.
export const RootNavigator = (): ReactElement | null => {
  const status = useSessionStore(state => state.status);

  switch (status) {
    case SessionStatus.BOOTING:
      return null;
    case SessionStatus.EMPTY:
      return <OnboardingNavigator />;
    case SessionStatus.LOCKED:
      return <LockedNavigator />;
    case SessionStatus.UNLOCKED:
      return <MainNavigator />;
  }
};
