import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Button, Text } from '../../atoms';
import { InlineAlert, MnemonicGrid, PasswordSheet, PasswordSheetProps, Screen, TopBar } from '../../molecules';
import { styles } from './recovery-phrase.styles';

export interface RecoveryPhrasePageProps {
  words?: string[];
  onOpenPasswordSheet: () => void;
  // Biometrics first when enabled, with the password field as the fallback.
  passwordSheet: Omit<PasswordSheetProps, 'title' | 'description' | 'confirmLabel'>;
  onCopy: () => void;
  onBack: () => void;
}

// Placeholder cells while hidden; the real word count is only known after the password check.
const MASKED_WORDS = Array.from({ length: 12 }, () => '');

export const RecoveryPhrasePage = (props: RecoveryPhrasePageProps): ReactElement => (
  <Screen header={<TopBar title='Recovery phrase' onBack={props.onBack} />}>
    <InlineAlert tone='warning' title='Keep this private' description='Anyone with your recovery phrase can access your wallet.' />
    <View style={styles.phraseHeader}>
      <Text variant='section' style={styles.phraseTitle}>{props.words ? `${props.words.length}-word phrase` : 'Hidden phrase'}</Text>
      <Button
        label='Copy'
        tone='secondary'
        size='compact'
        leadingIcon='copy'
        fullWidth={false}
        disabled={!props.words}
        style={styles.copy}
        onPress={props.onCopy}
      />
    </View>
    {props.words ? <MnemonicGrid words={props.words} /> : <MnemonicGrid words={MASKED_WORDS} masked />}
    <Text variant='body' color='secondary'>Write down the words in order and store them offline in a safe place.</Text>
    {!props.words && <Button label='Show recovery phrase' onPress={props.onOpenPasswordSheet} />}
    <PasswordSheet
      {...props.passwordSheet}
      visible={props.passwordSheet.visible && !props.words}
      title='Show recovery phrase'
      description='Enter your password to show the recovery phrase.'
      confirmLabel='Reveal phrase'
    />
  </Screen>
);
