import {DarkTheme, NavigationContainer, Theme} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import React from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';

import {ApprovalHost} from '../approvals/ApprovalHost';
import {AccountDetailsScreen} from '../screens/accounts/AccountDetailsScreen';
import {AccountsScreen} from '../screens/accounts/AccountsScreen';
import {BrowserScreen} from '../browser/BrowserScreen';
import {useWallet} from '../core/wallet-context';
import {HomeScreen} from '../screens/HomeScreen';
import {ConfirmMnemonicScreen} from '../screens/onboarding/ConfirmMnemonicScreen';
import {CreateMnemonicScreen} from '../screens/onboarding/CreateMnemonicScreen';
import {ImportWalletScreen} from '../screens/onboarding/ImportWalletScreen';
import {SetPasswordScreen} from '../screens/onboarding/SetPasswordScreen';
import {WelcomeScreen} from '../screens/onboarding/WelcomeScreen';
import {ManageNftScreen} from '../screens/nft/ManageNftScreen';
import {NftAssetScreen} from '../screens/nft/NftAssetScreen';
import {NftCollectionScreen} from '../screens/nft/NftCollectionScreen';
import {NftScreen} from '../screens/nft/NftScreen';
import {NftSendScreen} from '../screens/nft/NftSendScreen';
import {HistoryScreen} from '../screens/history/HistoryScreen';
import {TransactionDetailScreen} from '../screens/history/TransactionDetailScreen';
import {QrScanScreen} from '../screens/QrScanScreen';
import {AddTokenScreen} from '../screens/tokens/AddTokenScreen';
import {ManageTokensScreen} from '../screens/tokens/ManageTokensScreen';
import {SelectTokenScreen} from '../screens/tokens/SelectTokenScreen';
import {TokenDetailsScreen} from '../screens/tokens/TokenDetailsScreen';
import {ReceiveScreen} from '../screens/ReceiveScreen';
import {SendConfirmScreen} from '../screens/SendConfirmScreen';
import {SendScreen} from '../screens/SendScreen';
import {AddressBookScreen} from '../screens/settings/AddressBookScreen';
import {AddressEditScreen} from '../screens/settings/AddressEditScreen';
import {ChangePasswordScreen} from '../screens/settings/ChangePasswordScreen';
import {NetworkEditScreen} from '../screens/settings/NetworkEditScreen';
import {NetworksScreen} from '../screens/settings/NetworksScreen';
import {RevealMnemonicScreen} from '../screens/settings/RevealMnemonicScreen';
import {AutoLockScreen} from '../screens/settings/AutoLockScreen';
import {ResetWalletScreen} from '../screens/settings/ResetWalletScreen';
import {SecurityScreen} from '../screens/settings/SecurityScreen';
import {SettingsScreen} from '../screens/settings/SettingsScreen';
import {UnlockScreen} from '../screens/UnlockScreen';
import {colors, fonts, webColors} from '../ui/theme';
import type {MainStackParams, OnboardingStackParams} from './types';

const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
    notification: colors.danger,
  },
};

/** Popup sub-header: centred header4 title, no divider. */
const popupHeader: NativeStackNavigationOptions = {
  headerStyle: {backgroundColor: colors.background},
  headerTintColor: colors.text,
  headerTitleAlign: 'center',
  headerTitleStyle: {fontFamily: fonts.header5.fontFamily, fontSize: 20},
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal',
  contentStyle: {backgroundColor: colors.background},
};

const webHeader: NativeStackNavigationOptions = {
  headerShown: false,
  contentStyle: {backgroundColor: webColors.background},
};

const Onboarding = createNativeStackNavigator<OnboardingStackParams>();
const Main = createNativeStackNavigator<MainStackParams>();

function OnboardingNavigator() {
  // Onboarding screens draw the extension's web header (back + step dots).
  return (
    <Onboarding.Navigator screenOptions={webHeader}>
      <Onboarding.Screen name="Welcome" component={WelcomeScreen} />
      <Onboarding.Screen
        name="CreateMnemonic"
        component={CreateMnemonicScreen}
      />
      <Onboarding.Screen
        name="ConfirmMnemonic"
        component={ConfirmMnemonicScreen}
      />
      <Onboarding.Screen name="ImportWallet" component={ImportWalletScreen} />
      <Onboarding.Screen name="SetPassword" component={SetPasswordScreen} />
    </Onboarding.Navigator>
  );
}

function MainNavigator() {
  return (
    <Main.Navigator screenOptions={popupHeader}>
      <Main.Screen
        name="Home"
        component={HomeScreen}
        options={{headerShown: false}}
      />
      <Main.Screen
        name="Receive"
        component={ReceiveScreen}
        options={{title: 'Deposit GNOT'}}
      />
      <Main.Screen
        name="Send"
        component={SendScreen}
        options={{title: 'Send GNOT'}}
      />
      <Main.Screen
        name="SendConfirm"
        component={SendConfirmScreen}
        options={({route}) => ({
          title: route.params.kind === 'nft' ? 'Sending NFT' : 'Sending GNOT',
        })}
      />
      <Main.Screen
        name="SelectToken"
        component={SelectTokenScreen}
        options={{title: 'Send'}}
      />
      <Main.Screen name="TokenDetails" component={TokenDetailsScreen} />
      <Main.Screen
        name="History"
        component={HistoryScreen}
        options={{title: 'History'}}
      />
      <Main.Screen
        name="TransactionDetail"
        component={TransactionDetailScreen}
        options={{title: 'Transaction'}}
      />
      <Main.Screen
        name="ManageTokens"
        component={ManageTokensScreen}
        options={{title: 'Manage Tokens'}}
      />
      <Main.Screen
        name="AddToken"
        component={AddTokenScreen}
        options={{title: 'Add Custom Token'}}
      />
      <Main.Screen name="Nft" component={NftScreen} options={{title: 'NFTs'}} />
      <Main.Screen name="NftCollection" component={NftCollectionScreen} />
      <Main.Screen name="NftAsset" component={NftAssetScreen} />
      <Main.Screen
        name="ManageNft"
        component={ManageNftScreen}
        options={{title: 'Manage Collectables'}}
      />
      <Main.Screen
        name="NftSend"
        component={NftSendScreen}
        options={{title: 'Send NFT'}}
      />
      <Main.Screen
        name="QrScan"
        component={QrScanScreen}
        options={{title: 'Scan'}}
      />
      <Main.Screen
        name="Browser"
        component={BrowserScreen}
        options={{headerShown: false}}
      />
      <Main.Screen name="Settings" component={SettingsScreen} />
      <Main.Screen
        name="Security"
        component={SecurityScreen}
        options={{title: 'Security & Privacy'}}
      />
      <Main.Screen
        name="AutoLock"
        component={AutoLockScreen}
        options={{title: 'Auto-Lock Timer'}}
      />
      <Main.Screen
        name="ResetWallet"
        component={ResetWalletScreen}
        options={{title: ''}}
      />
      <Main.Screen
        name="Networks"
        component={NetworksScreen}
        options={{title: 'Change Network'}}
      />
      <Main.Screen name="NetworkEdit" component={NetworkEditScreen} />
      <Main.Screen
        name="Accounts"
        component={AccountsScreen}
        options={{title: 'Accounts'}}
      />
      <Main.Screen
        name="AccountDetails"
        component={AccountDetailsScreen}
        options={{title: 'Account Details'}}
      />
      <Main.Screen
        name="AddressBook"
        component={AddressBookScreen}
        options={{title: 'Address Book'}}
      />
      <Main.Screen name="AddressEdit" component={AddressEditScreen} />
      <Main.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{title: 'Change Password'}}
      />
      <Main.Screen
        name="RevealMnemonic"
        component={RevealMnemonicScreen}
        options={{title: 'Reveal Seed Phrase'}}
      />
    </Main.Navigator>
  );
}

export function RootNavigator() {
  const {status} = useWallet();

  if (status === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {status === 'no-wallet' && <OnboardingNavigator />}
      {status === 'locked' && <UnlockScreen />}
      {status === 'unlocked' && (
        <>
          <MainNavigator />
          <ApprovalHost />
        </>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
