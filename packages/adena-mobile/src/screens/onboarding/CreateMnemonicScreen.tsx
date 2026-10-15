import {ADENA_DOCS_PAGE} from '@common/constants/resource.constant';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AdenaWallet} from 'adena-module';
import React, {useEffect, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {pendingSecret} from '../../core/pending-secret';
import type {OnboardingStackParams} from '../../navigation/types';
import {useSecureScreen} from '../../security/use-secure-screen';
import {
  HoldToReveal,
  SeedGrid,
  WebButton,
  WebCheckBox,
  WebDanger,
  WebScreen,
  WebStepHeader,
  WebTitle,
  WebWarning,
} from '../../ui/web';
import {SensitiveInfoStep} from './SensitiveInfoStep';

type Props = NativeStackScreenProps<OnboardingStackParams, 'CreateMnemonic'>;

// 24 words = 256 bits of entropy from the native CSPRNG (via CryptoProvider).
const WORD_COUNT = 24;

/** Create flow: this screen, ConfirmMnemonic, SetPassword. */
export const CREATE_FLOW_STEPS = 3;

/**
 * The extension's create-wallet steps: a warning first, then the phrase,
 * masked until the user agrees and holds the reveal button. There is no Copy
 * button: a phrase on the clipboard is readable by other apps.
 */
export function CreateMnemonicScreen({navigation}: Props) {
  const {screenshotTaken} = useSecureScreen();
  const [phase, setPhase] = useState<'intro' | 'phrase'>('intro');
  const [words, setWords] = useState<string[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => () => setWords([]), []);

  const showPhrase = () => {
    const mnemonic = AdenaWallet.generateMnemonic(WORD_COUNT);
    pendingSecret.set({kind: 'mnemonic', value: mnemonic});
    setWords(mnemonic.split(' '));
    setPhase('phrase');
  };

  const header = (
    <WebStepHeader
      step={0}
      steps={CREATE_FLOW_STEPS}
      onBack={() => {
        pendingSecret.clear();
        navigation.goBack();
      }}
    />
  );

  if (phase === 'intro') {
    return (
      <WebScreen header={header}>
        <SensitiveInfoStep
          description="This will generate a seed phrase on your device. Only proceed if you understand how to safely store your seed phrase."
          learnMoreUrl={`${ADENA_DOCS_PAGE}/user-guide/sign-in/create-new-wallet`}
          onNext={showPhrase}
        />
      </WebScreen>
    );
  }

  return (
    <WebScreen
      header={header}
      footer={
        unlocked ? (
          <WebButton
            testID="mnemonic-next"
            title="Next"
            chevron
            disabled={!saved}
            onPress={() => {
              setRevealed(false);
              navigation.navigate('ConfirmMnemonic');
            }}
          />
        ) : (
          <WebButton
            testID="mnemonic-reveal"
            title="Reveal Seed Phrase"
            disabled={!agreed}
            onPress={() => setUnlocked(true)}
          />
        )
      }>
      <View style={styles.messages}>
        <WebTitle title="Seed Phrase" />
        <WebWarning>
          This phrase is the only way to recover this wallet. DO NOT share it
          with anyone.
        </WebWarning>
        {screenshotTaken ? (
          <WebDanger>
            A screenshot was taken. Delete it from your photos and any cloud
            backup: apps that read your gallery can steal the phrase. Consider
            creating a new wallet.
          </WebDanger>
        ) : (
          <WebWarning>
            Write it on paper. Do not take a screenshot or keep it in a notes or
            cloud app.
          </WebWarning>
        )}
      </View>
      <SeedGrid words={words} hidden={!revealed} />
      {unlocked ? (
        <>
          <View style={styles.center}>
            <HoldToReveal revealed={revealed} onChange={setRevealed} />
          </View>
          <WebCheckBox
            testID="mnemonic-saved"
            checked={saved}
            onChange={setSaved}
            label="I have saved my seed phrase."
          />
        </>
      ) : (
        <WebCheckBox
          testID="mnemonic-agree"
          checked={agreed}
          onChange={setAgreed}
          label="This phrase will only be stored on this device. Adena can't recover it for you."
        />
      )}
    </WebScreen>
  );
}

const styles = StyleSheet.create({
  messages: {gap: 16},
  center: {alignItems: 'center'},
});
