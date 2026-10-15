import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import React from 'react';
import {ActivityIndicator, StyleSheet, View} from 'react-native';

import {ApprovalHost} from '../approvals/ApprovalHost';
import {BrowserScreen} from '../browser/BrowserScreen';
import {useWallet} from '../core/wallet-context';
import {HomeScreen} from '../screens/HomeScreen';
import {ConfirmMnemonicScreen} from '../screens/onboarding/ConfirmMnemonicScreen';
import {CreateMnemonicScreen} from '../screens/onboarding/CreateMnemonicScreen';
import {ImportWalletScreen} from '../screens/onboarding/ImportWalletScreen';
import {SetPasswordScreen} from '../screens/onboarding/SetPasswordScreen';
import {WelcomeScreen} from '../screens/onboarding/WelcomeScreen';
import {QrScanScreen} from '../screens/QrScanScreen';
import {ReceiveScreen} from '../screens/ReceiveScreen';
import {SendConfirmScreen} from '../screens/SendConfirmScreen';
import {SendScreen} from '../screens/SendScreen';
import {ChangePasswordScreen} from '../screens/settings/ChangePasswordScreen';
import {NetworksScreen} from '../screens/settings/NetworksScreen';
import {RevealMnemonicScreen} from '../screens/settings/RevealMnemonicScreen';
import {SettingsScreen} from '../screens/settings/SettingsScreen';
import {UnlockScreen} from '../screens/UnlockScreen';
import type {MainStackParams, OnboardingStackParams} from './types';

const Onboarding = createNativeStackNavigator<OnboardingStackParams>();
const Main = createNativeStackNavigator<MainStackParams>();

function OnboardingNavigator() {
  return (
    <Onboarding.Navigator>
      <Onboarding.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{headerShown: false}}
      />
      <Onboarding.Screen
        name="CreateMnemonic"
        component={CreateMnemonicScreen}
        options={{title: 'New wallet'}}
      />
      <Onboarding.Screen
        name="ConfirmMnemonic"
        component={ConfirmMnemonicScreen}
        options={{title: 'Confirm'}}
      />
      <Onboarding.Screen
        name="ImportWallet"
        component={ImportWalletScreen}
        options={{title: 'Import'}}
      />
      <Onboarding.Screen
        name="SetPassword"
        component={SetPasswordScreen}
        options={{title: 'Password'}}
      />
    </Onboarding.Navigator>
  );
}

function MainNavigator() {
  return (
    <Main.Navigator>
      <Main.Screen
        name="Home"
        component={HomeScreen}
        options={{title: 'Adena'}}
      />
      <Main.Screen name="Receive" component={ReceiveScreen} />
      <Main.Screen name="Send" component={SendScreen} />
      <Main.Screen
        name="SendConfirm"
        component={SendConfirmScreen}
        options={{title: 'Review'}}
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
        name="Networks"
        component={NetworksScreen}
        options={{title: 'Network'}}
      />
      <Main.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{title: 'Password'}}
      />
      <Main.Screen
        name="RevealMnemonic"
        component={RevealMnemonicScreen}
        options={{title: 'Recovery phrase'}}
      />
    </Main.Navigator>
  );
}

export function RootNavigator() {
  const {status} = useWallet();

  if (status === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer>
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
  loading: {flex: 1, justifyContent: 'center'},
});
