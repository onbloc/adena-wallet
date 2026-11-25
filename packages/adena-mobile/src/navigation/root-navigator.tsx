import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { ReactElement } from 'react';

import { Text } from '../components/atoms';
import { Screen } from '../components/molecules';
import { BackupPhraseScreen } from '../containers/onboarding/backup-phrase-screen';
import { CreatePasswordScreen } from '../containers/onboarding/create-password-screen';
import { ImportWalletScreen } from '../containers/onboarding/import-wallet-screen';
import { WelcomeScreen } from '../containers/onboarding/welcome-screen';
import { ResetWalletScreen } from '../containers/reset-wallet-screen';
import { UnlockScreen } from '../containers/unlock-screen';
import { SessionStatus, useSessionStore } from '../stores/session.store';
import { colors, motion } from '../theme';
import { LockedStackParamList, MainStackParamList, OnboardingStackParamList } from './types';

const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const LockedStack = createNativeStackNavigator<LockedStackParamList>();

const screenOptions = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.background.canvas },
  animationDuration: motion.transition,
} as const;

const OnboardingNavigator = (): ReactElement => (
  <OnboardingStack.Navigator screenOptions={screenOptions}>
    <OnboardingStack.Screen name='Welcome' component={WelcomeScreen} />
    <OnboardingStack.Screen name='BackupPhrase' component={BackupPhraseScreen} />
    <OnboardingStack.Screen name='ImportWallet' component={ImportWalletScreen} />
    <OnboardingStack.Screen name='CreatePassword' component={CreatePasswordScreen} />
  </OnboardingStack.Navigator>
);

const LockedNavigator = (): ReactElement => (
  <LockedStack.Navigator screenOptions={screenOptions}>
    <LockedStack.Screen name='Unlock' component={UnlockScreen} />
    <LockedStack.Screen name='ResetWallet' component={ResetWalletScreen} />
  </LockedStack.Navigator>
);

// Placeholder until the wallet screens land; reset stays reachable from the unlocked state.
const WalletPlaceholder = (): ReactElement => (
  <Screen>
    <Text variant='title'>Wallet</Text>
  </Screen>
);

const MainNavigator = (): ReactElement => (
  <MainStack.Navigator screenOptions={screenOptions}>
    <MainStack.Screen name='Main' component={WalletPlaceholder} />
    <MainStack.Screen name='ResetWallet' component={ResetWalletScreen} />
  </MainStack.Navigator>
);

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
