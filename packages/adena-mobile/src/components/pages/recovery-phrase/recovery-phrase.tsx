import React, { ReactElement } from 'react';

import { Button, Text } from '../../atoms';
import { InlineAlert, MnemonicGrid, PasswordSheet, Screen, TopBar } from '../../molecules';

export interface RecoveryPhrasePageProps {
  words?: string[];
  passwordSheetVisible: boolean;
  onOpenPasswordSheet: () => void;
  onClosePasswordSheet: () => void;
  password: string;
  onChangePassword: (value: string) => void;
  error?: string;
  verifying: boolean;
  onReveal: () => void;
  onBack: () => void;
}

// Placeholder cells while hidden; the real word count is only known after the password check.
const MASKED_WORDS = Array.from({ length: 12 }, () => '');

export const RecoveryPhrasePage = (props: RecoveryPhrasePageProps): ReactElement => (
  <Screen
    header={<TopBar title='Recovery phrase' onBack={props.onBack} />}
    footer={!props.words && <Button label='Show recovery phrase' onPress={props.onOpenPasswordSheet} />}
  >
    <InlineAlert tone='warning' title='Keep this private' description='Anyone with your recovery phrase can access your wallet.' />
    {props.words && <Text variant='section'>{`${props.words.length}-word phrase`}</Text>}
    {props.words ? <MnemonicGrid words={props.words} /> : <MnemonicGrid words={MASKED_WORDS} masked />}
    <Text variant='body' color='secondary'>Write down the words in order and store them offline in a safe place.</Text>
    <PasswordSheet
      visible={props.passwordSheetVisible && !props.words}
      title='Show recovery phrase'
      description='Enter your password to show the recovery phrase.'
      password={props.password}
      onChangePassword={props.onChangePassword}
      error={props.error}
      submitting={props.verifying}
      confirmLabel='Reveal phrase'
      onConfirm={props.onReveal}
      onClose={props.onClosePasswordSheet}
    />
  </Screen>
);
