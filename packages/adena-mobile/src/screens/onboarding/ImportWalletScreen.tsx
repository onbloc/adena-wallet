import {ADENA_DOCS_PAGE} from '@common/constants/resource.constant';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {EnglishMnemonic} from 'adena-module';
import React, {useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {pendingSecret} from '../../core/pending-secret';
import {normalizePrivateKey} from '../../core/private-key';
import type {OnboardingStackParams} from '../../navigation/types';
import {useSecureScreen} from '../../security/use-secure-screen';
import {
  SeedWordInput,
  WebButton,
  WebCheckBox,
  WebErrorText,
  WebInput,
  WebScreen,
  WebStepHeader,
  WebTabs,
  WebTitle,
} from '../../ui/web';
import {Questionnaire} from './Questionnaire';
import {SensitiveInfoStep} from './SensitiveInfoStep';

type Props = NativeStackScreenProps<OnboardingStackParams, 'ImportWallet'>;

/** Import flow: this screen (warning, questionnaire, input), SetPassword. */
export const IMPORT_FLOW_STEPS = 4;

/** Word count, wordlist membership and checksum, via adena-module's BIP39 code. */
export function isValidMnemonic(mnemonic: string): boolean {
  try {
    return new EnglishMnemonic(mnemonic).toString() === mnemonic;
  } catch {
    return false;
  }
}

export function normalizeMnemonic(input: string): string {
  return input.trim().toLowerCase().split(/\s+/).join(' ');
}

/**
 * Puts `text` into cell `index`; a pasted phrase (several words) fills the
 * following cells too, as the extension's seed input does.
 */
export function fillWords(
  current: string[],
  index: number,
  text: string,
): string[] {
  const pasted = text.trim().split(/\s+/).filter(Boolean);
  if (pasted.length <= 1) {
    return current.map((word, i) => (i === index ? text.trim() : word));
  }
  return current.map((word, i) =>
    i >= index && i - index < pasted.length ? pasted[i - index] : word,
  );
}

type ImportMode = '12' | '24' | 'privateKey';

const TABS: {key: ImportMode; label: string}[] = [
  {key: '12', label: '12 words'},
  {key: '24', label: '24 words'},
  {key: 'privateKey', label: 'Private Key'},
];

export function ImportWalletScreen({navigation}: Props) {
  useSecureScreen();
  const [phase, setPhase] = useState<'intro' | 'questionnaire' | 'input'>(
    'intro',
  );
  const [mode, setMode] = useState<ImportMode>('12');
  const [words, setWords] = useState<string[]>(() => Array(12).fill(''));
  const [privateKey, setPrivateKey] = useState('');
  const [agreed, setAgreed] = useState(false);

  const switchMode = (next: ImportMode) => {
    setMode(next);
    setWords(Array(next === '24' ? 24 : 12).fill(''));
    setPrivateKey('');
  };

  const mnemonic = normalizeMnemonic(words.join(' '));
  const complete =
    mode === 'privateKey' ? !!privateKey.trim() : words.every(Boolean);
  const valid = useMemo(() => {
    if (!complete) {
      return false;
    }
    return mode === 'privateKey'
      ? !!normalizePrivateKey(privateKey)
      : isValidMnemonic(mnemonic);
  }, [complete, mode, privateKey, mnemonic]);

  const next = () => {
    if (mode === 'privateKey') {
      const normalized = normalizePrivateKey(privateKey);
      if (!normalized) {
        return;
      }
      pendingSecret.set({kind: 'privateKey', value: normalized});
    } else {
      pendingSecret.set({kind: 'mnemonic', value: mnemonic});
    }
    setWords(current => current.map(() => ''));
    setPrivateKey('');
    navigation.navigate('SetPassword', {flow: 'import'});
  };

  const header = (step: number, onBack: () => void) => (
    <WebStepHeader step={step} steps={IMPORT_FLOW_STEPS} onBack={onBack} />
  );

  if (phase === 'intro') {
    return (
      <WebScreen header={header(0, () => navigation.goBack())}>
        <SensitiveInfoStep
          description="You are about to import your seed phrase or private key on this device. We recommend connecting with a hardware wallet for higher security."
          learnMoreUrl={`${ADENA_DOCS_PAGE}/user-guide/sign-in/import-wallet`}
          onNext={() => setPhase('questionnaire')}
        />
      </WebScreen>
    );
  }

  if (phase === 'questionnaire') {
    return (
      <Questionnaire
        header={onBack => header(1, onBack)}
        onExit={() => setPhase('intro')}
        onComplete={() => setPhase('input')}
      />
    );
  }

  return (
    <WebScreen
      header={header(2, () => {
        switchMode(mode);
        setPhase('intro');
      })}
      footer={
        <WebButton
          testID="import-next"
          title="Next"
          chevron
          disabled={!agreed || !valid}
          onPress={next}
        />
      }>
      <WebTitle
        title="Import Existing Wallet"
        description="Enter a seed phrase or your private key to import your existing wallet."
      />
      <WebTabs tabs={TABS} value={mode} onChange={switchMode} />
      {mode === 'privateKey' ? (
        <WebInput
          label="Private Key"
          secret
          value={privateKey}
          error={complete && !valid}
          onChangeText={setPrivateKey}
        />
      ) : (
        <View style={styles.grid}>
          {words.map((word, index) => (
            <SeedWordInput
              key={`${mode}-${index}`}
              label={`${index + 1}`}
              labelWidth={28}
              compact
              containerStyle={styles.cell}
              error={complete && !valid}
              value={word}
              onChangeText={text =>
                setWords(current => fillWords(current, index, text))
              }
            />
          ))}
        </View>
      )}
      <WebErrorText>
        {complete && !valid
          ? mode === 'privateKey'
            ? 'Invalid private key'
            : 'Invalid seed phrase'
          : ''}
      </WebErrorText>
      <WebCheckBox
        testID="import-agree"
        checked={agreed}
        onChange={setAgreed}
        label="This will only be stored on this device. Adena can't recover it for you."
      />
    </WebScreen>
  );
}

const styles = StyleSheet.create({
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  // Three columns with two 8px gaps.
  cell: {width: '31.5%', flexGrow: 1},
});
