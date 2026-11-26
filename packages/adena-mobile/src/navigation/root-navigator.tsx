import { createNativeStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import React, { ReactElement, useMemo } from 'react';

import { SHEET_ROUTE, SheetScreen, useSheetScreenOptions } from '../components/molecules';
import { SplashPage } from '../components/pages';
import { AccountSettingsScreen } from '../containers/main/account-settings-screen';
import { AccountsScreen } from '../containers/main/accounts-screen';
import { ActivityDetailScreen } from '../containers/main/activity-detail-screen';
import { AddNetworkScreen } from '../containers/main/add-network-screen';
import { AddTokenScreen } from '../containers/main/add-token-screen';
import { AddressBookEditScreen } from '../containers/main/address-book-edit-screen';
import { AddressBookScreen } from '../containers/main/address-book-screen';
import { BuyCryptoScreen } from '../containers/main/buy-crypto-screen';
import { CardCreateScreen } from '../containers/main/card-create-screen';
import { CardDetailScreen } from '../containers/main/card-detail-screen';
import { ChangePasswordScreen } from '../containers/main/change-password-screen';
import { CheckoutScreen } from '../containers/main/checkout-screen';
import { CloudBackupScreen } from '../containers/main/cloud-backup-screen';
import { ConnectedAppsScreen } from '../containers/main/connected-apps-screen';
import { DappRequestScreen } from '../containers/main/dapp-request-screen';
import { EditProfileScreen } from '../containers/main/edit-profile-screen';
import { ImportAccountScreen } from '../containers/main/import-account-screen';
import { ManageNftsScreen } from '../containers/main/manage-nfts-screen';
import { ManageTokensScreen } from '../containers/main/manage-tokens-screen';
import { NetworksScreen } from '../containers/main/networks-screen';
import { NftCollectionScreen } from '../containers/main/nft-collection-screen';
import { NftDetailScreen } from '../containers/main/nft-detail-screen';
import { OrderCreateScreen } from '../containers/main/order-create-screen';
import { OrderDetailScreen } from '../containers/main/order-detail-screen';
import { QrScannerScreen } from '../containers/main/qr-scanner-screen';
import { ReceiveScreen } from '../containers/main/receive-screen';
import { RecoveryPhraseScreen } from '../containers/main/recovery-phrase-screen';
import { SearchScreen } from '../containers/main/search-screen';
import { SendAmountScreen } from '../containers/main/send-amount-screen';
import { SendNftScreen } from '../containers/main/send-nft-screen';
import { SendRecipientScreen } from '../containers/main/send-recipient-screen';
import { SettingsScreen } from '../containers/main/settings-screen';
import { SwapScreen } from '../containers/main/swap-screen';
import { TokenDetailsScreen } from '../containers/main/token-details-screen';
import { BackupPhraseScreen } from '../containers/onboarding/backup-phrase-screen';
import { CreatePasswordScreen } from '../containers/onboarding/create-password-screen';
import { ImportWalletScreen } from '../containers/onboarding/import-wallet-screen';
import { RestoreBackupScreen } from '../containers/onboarding/restore-backup-screen';
import { WelcomeScreen } from '../containers/onboarding/welcome-screen';
import { ResetWalletScreen } from '../containers/reset-wallet-screen';
import { SplashScreen } from '../containers/splash-screen';
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
  const sheetOptions = useSheetScreenOptions();

  return (
    <OnboardingStack.Navigator screenOptions={screenOptions}>
      <OnboardingStack.Screen name='Welcome' component={WelcomeScreen} />
      <OnboardingStack.Screen name='BackupPhrase' component={BackupPhraseScreen} />
      <OnboardingStack.Screen name='ImportWallet' component={ImportWalletScreen} />
      <OnboardingStack.Screen name='CreatePassword' component={CreatePasswordScreen} />
      <OnboardingStack.Screen name='RestoreBackup' component={RestoreBackupScreen} />
      <OnboardingStack.Screen name={SHEET_ROUTE} component={SheetScreen} options={sheetOptions} />
    </OnboardingStack.Navigator>
  );
};

const LockedNavigator = (): ReactElement => {
  const screenOptions = useScreenOptions();
  const sheetOptions = useSheetScreenOptions();

  return (
    <LockedStack.Navigator screenOptions={screenOptions}>
      <LockedStack.Screen name='Splash' component={SplashScreen} />
      {/* Fades in from the splash rather than sliding over it. */}
      <LockedStack.Screen name='Unlock' component={UnlockScreen} options={{ animation: 'fade' }} />
      <LockedStack.Screen name='ResetWallet' component={ResetWalletScreen} />
      <LockedStack.Screen name={SHEET_ROUTE} component={SheetScreen} options={sheetOptions} />
    </LockedStack.Navigator>
  );
};

const MainNavigator = (): ReactElement => {
  const screenOptions = useScreenOptions();
  const sheetOptions = useSheetScreenOptions();

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
      <MainStack.Screen name='Receive' component={ReceiveScreen} options={sheetOptions} />
      <MainStack.Screen name='QrScanner' component={QrScannerScreen} options={{ presentation: 'fullScreenModal' }} />
      <MainStack.Screen name='Settings' component={SettingsScreen} />
      <MainStack.Screen name='RecoveryPhrase' component={RecoveryPhraseScreen} />
      <MainStack.Screen name='ChangePassword' component={ChangePasswordScreen} />
      <MainStack.Screen name='CloudBackup' component={CloudBackupScreen} />
      <MainStack.Screen name='ConnectedApps' component={ConnectedAppsScreen} />
      <MainStack.Screen name='Networks' component={NetworksScreen} />
      <MainStack.Screen name='AddNetwork' component={AddNetworkScreen} />
      <MainStack.Screen name='Search' component={SearchScreen} />
      <MainStack.Screen name='BuyCrypto' component={BuyCryptoScreen} />
      <MainStack.Screen name='Checkout' component={CheckoutScreen} />
      <MainStack.Screen name='Swap' component={SwapScreen} options={{ presentation: 'fullScreenModal' }} />
      <MainStack.Screen name='CardCreate' component={CardCreateScreen} />
      <MainStack.Screen name='CardDetail' component={CardDetailScreen} />
      <MainStack.Screen name='OrderCreate' component={OrderCreateScreen} />
      <MainStack.Screen name='OrderDetail' component={OrderDetailScreen} />
      <MainStack.Screen
        name='DappRequest'
        component={DappRequestScreen}
        options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
      />
      {/* Hosts every BottomSheet of this stack (see molecules/bottom-sheet). */}
      <MainStack.Screen name={SHEET_ROUTE} component={SheetScreen} options={sheetOptions} />
    </MainStack.Navigator>
  );
};

// The session status decides which stack exists, so locked screens are never mounted behind the unlock page.
export const RootNavigator = (): ReactElement => {
  const status = useSessionStore(state => state.status);

  switch (status) {
    // Holds the launch logo until the stored wallet status is read.
    case SessionStatus.BOOTING:
      return <SplashPage />;
    case SessionStatus.EMPTY:
      return <OnboardingNavigator />;
    case SessionStatus.LOCKED:
      return <LockedNavigator />;
    case SessionStatus.UNLOCKED:
      return <MainNavigator />;
  }
};
