import {ADENA_DOCS_PAGE} from '@common/constants/resource.constant';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {EnglishMnemonic} from 'adena-module';
import React, {useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';

import {withPrivateKeyAccount} from '../../core/account-import';
import {PendingSecret, pendingSecret} from '../../core/pending-secret';
import {normalizePrivateKey} from '../../core/private-key';
import {useWallet} from '../../core/wallet-context';
import type {
  MainStackParams,
  OnboardingStackParams,
} from '../../navigation/types';
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
import {flowSteps, SeedFlowMode, useQuestionnaireGate} from './seed-flow';
import {SensitiveInfoStep} from './SensitiveInfoStep';

/** Onboarding: warning, questionnaire, input, password. */
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

/** The first wallet: a password is set next. */
export function ImportWalletScreen({
  navigation,
}: NativeStackScreenProps<OnboardingStackParams, 'ImportWallet'>) {
  return (
    <ImportWalletFlow
      mode="onboarding"
      onLeave={() => navigation.goBack()}
      onSubmit={async secret => {
        pendingSecret.set(secret);
        navigation.navigate('SetPassword', {flow: 'import'});
      }}
    />
  );
}

/**
 * Add Account > Import: a private key account is added right away; a seed
 * phrase goes on to the choice of its accounts.
 */
export function ImportAccountScreen({
  navigation,
}: NativeStackScreenProps<MainStackParams, 'ImportAccount'>) {
  const {wallet, net, saveAddedAccounts} = useWallet();
  return (
    <ImportWalletFlow
      mode="add"
      onLeave={() => navigation.goBack()}
      onSubmit={async (secret, select) => {
        if (secret.kind === 'mnemonic') {
          pendingSecret.set(secret);
          navigation.navigate('SelectImportAccounts', select);
          return;
        }
        if (!wallet || !net) {
          return 'The wallet is not ready. Try again.';
        }
        const result = await withPrivateKeyAccount(
          wallet,
          secret.value,
          net.network.addressPrefix,
        );
        if (!result.ok) {
          return 'Private key already registered';
        }
        await saveAddedAccounts(result.next, result.added[0].id);
        navigation.popToTop();
      }}
    />
  );
}

/**
 * The web's import steps: a warning, the questionnaire, then a 12 or 24
 * word phrase or a private key. `onSubmit` resolves to an error message to
 * show, or nothing when it moved on.
 */
function ImportWalletFlow({
  mode: flow,
  onLeave,
  onSubmit,
}: {
  mode: SeedFlowMode;
  onLeave: () => void;
  onSubmit: (
    secret: PendingSecret,
    select: {step: number; steps: number},
  ) => Promise<string | void>;
}) {
  useSecureScreen();
  const questionnaire = useQuestionnaireGate(flow);
  const {total, first} = flowSteps(
    flow,
    questionnaire.needed !== false,
    flow === 'add' ? 2 : 1,
  );
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<'intro' | 'questionnaire' | 'input'>(
    'intro',
  );
  const [mode, setMode] = useState<ImportMode>('12');
  const [words, setWords] = useState<string[]>(() => Array(12).fill(''));
  const [privateKey, setPrivateKey] = useState('');
  const [agreed, setAgreed] = useState(false);

  const switchMode = (next: ImportMode) => {
    setFailure('');
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

  const next = async () => {
    let secret: PendingSecret;
    if (mode === 'privateKey') {
      const normalized = normalizePrivateKey(privateKey);
      if (!normalized) {
        return;
      }
      secret = {kind: 'privateKey', value: normalized};
    } else {
      secret = {kind: 'mnemonic', value: mnemonic};
    }
    setBusy(true);
    try {
      const error = await onSubmit(secret, {step: first + 1, steps: total});
      if (error) {
        setFailure(error);
        return;
      }
      setWords(current => current.map(() => ''));
      setPrivateKey('');
    } catch {
      setFailure('Could not add the account. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const header = (step: number, onBack: () => void) => (
    <WebStepHeader step={step} steps={total} onBack={onBack} />
  );

  if (phase === 'intro') {
    return (
      <WebScreen header={header(0, onLeave)}>
        <SensitiveInfoStep
          description="You are about to import your seed phrase or private key on this device. We recommend connecting with a hardware wallet for higher security."
          learnMoreUrl={`${ADENA_DOCS_PAGE}/user-guide/sign-in/import-wallet`}
          onNext={() =>
            setPhase(questionnaire.needed === false ? 'input' : 'questionnaire')
          }
        />
      </WebScreen>
    );
  }

  if (phase === 'questionnaire') {
    return (
      <Questionnaire
        header={onBack => header(1, onBack)}
        onExit={() => setPhase('intro')}
        onComplete={() => {
          questionnaire.passed();
          setPhase('input');
        }}
      />
    );
  }

  return (
    <WebScreen
      header={header(first, () => {
        switchMode(mode);
        setPhase('intro');
      })}
      footer={
        <WebButton
          testID="import-next"
          title="Next"
          chevron
          disabled={busy || !agreed || !valid}
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
          onChangeText={text => {
            setFailure('');
            setPrivateKey(text);
          }}
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
              onChangeText={text => {
                setFailure('');
                setWords(current => fillWords(current, index, text));
              }}
            />
          ))}
        </View>
      )}
      <WebErrorText>
        {complete && !valid
          ? mode === 'privateKey'
            ? 'Invalid private key'
            : 'Invalid seed phrase'
          : failure}
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
