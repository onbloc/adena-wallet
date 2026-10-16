import CreateIcon from '@assets/web/create.svg';
import ImportIcon from '@assets/web/import.svg';
import welcomeAnimation from '@assets/web/lottie/welcome.json';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React from 'react';
import {StyleSheet, View} from 'react-native';

import type {OnboardingStackParams} from '../../navigation/types';
import {Animation} from '../../ui/animation';
import {colorTokens} from '../../ui/theme';
import {WebChoiceButton, WebScreen, WebText, WebWarning} from '../../ui/web';

type Props = NativeStackScreenProps<OnboardingStackParams, 'Welcome'>;

/** The extension's landing screen, with the two standard-wallet choices. */
export function WelcomeScreen({navigation}: Props) {
  return (
    <WebScreen>
      <View style={styles.body}>
        <Animation source={welcomeAnimation} style={styles.animation} />
        <View style={styles.titles}>
          <WebText type="headline4">Welcome to Adena</WebText>
          <WebText type="body4" color={colorTokens.webNeutral._500}>
            The only wallet you need for Gnoland with unparalleled security
          </WebText>
        </View>
        <View style={styles.choices}>
          <WebChoiceButton
            testID="welcome-create"
            figure="primary"
            icon={<CreateIcon width={24} height={24} />}
            title="Create New Wallet"
            description="Generate a new 12 or 24-word seed phrase you can use to create multiple accounts."
            onPress={() => navigation.navigate('CreateMnemonic')}
          />
          <WebChoiceButton
            testID="welcome-import"
            figure="secondary"
            icon={<ImportIcon width={24} height={24} />}
            title="Import Existing Wallet"
            description="Use a seed phrase or private key to import an existing wallet."
            onPress={() => navigation.navigate('ImportWallet')}
          />
        </View>
        <WebWarning>
          Adena will never ask for your seed phrase. Anyone who asks for it, in
          an app, a website or a message, is trying to take your funds.
        </WebWarning>
      </View>
    </WebScreen>
  );
}

const styles = StyleSheet.create({
  body: {flex: 1, justifyContent: 'center', gap: 40},
  animation: {height: 200},
  titles: {gap: 8},
  choices: {gap: 16},
});
