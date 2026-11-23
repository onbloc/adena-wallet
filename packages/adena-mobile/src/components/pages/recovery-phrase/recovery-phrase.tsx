import React, { ReactElement } from 'react';

import { Button, Text } from '../../atoms';
import { InlineAlert, MnemonicGrid, Screen, TextField, TopBar } from '../../molecules';

export interface RecoveryPhrasePageProps {
  words?: string[];
  password: string;
  onChangePassword: (value: string) => void;
  error?: string;
  verifying: boolean;
  onReveal: () => void;
  onBack: () => void;
}

export const RecoveryPhrasePage = ({ words, password, onChangePassword, error, verifying, onReveal, onBack }: RecoveryPhrasePageProps): ReactElement => (
  <Screen
    header={<TopBar title='Recovery phrase' onBack={onBack} />}
    footer={!words && <Button label='Reveal phrase' disabled={!password} loading={verifying} loadingLabel='Verifying…' onPress={onReveal} />}
  >
    <InlineAlert tone='warning' title='Keep it private' description='Anyone who sees this phrase can take your assets.' />
    {words
      ? <MnemonicGrid words={words} />
      : (
          <>
            <Text variant='body' color='secondary'>Enter your password to show the recovery phrase.</Text>
            <TextField label='Password' value={password} onChangeText={onChangePassword} placeholder='Password' secure autoCapitalize='none' error={error} />
          </>
        )}
  </Screen>
);
