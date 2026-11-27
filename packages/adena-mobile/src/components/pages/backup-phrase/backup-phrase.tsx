import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Button, Text } from '../../atoms';
import { InlineAlert, MnemonicGrid, PageHeading, Screen, TopBar } from '../../molecules';
import { useStyles } from './backup-phrase.styles';

const MASKED_PREVIEW = 4;

export interface BackupPhrasePageProps {
  words: string[];
  // Words show only after the user asks; masked again while the app is in the background.
  masked: boolean;
  onReveal: () => void;
  // Continue stays off until the words were shown once.
  canContinue: boolean;
  onContinue: () => void;
  onBack: () => void;
}

export const BackupPhrasePage = ({ words, masked, onReveal, canContinue, onContinue, onBack }: BackupPhrasePageProps): ReactElement => {
  const styles = useStyles();

  return (
    <Screen
      header={<TopBar onBack={onBack} />}
      footer={<Button label='Continue' disabled={!canContinue} onPress={onContinue} testID='backup-continue' />}
    >
      <PageHeading
        eyebrow='Backup / Recovery guide'
        title={`${words.length} words.\nOne wallet.`}
        description='Your recovery phrase restores access to your wallet on another device.'
      />
      <View style={styles.card} testID={masked ? 'backup-phrase-masked' : 'backup-phrase-words'}>
        <Text variant='meta' color='secondary' style={styles.cardLabel}>Your recovery phrase</Text>
        {/* Hidden, only a preview of the first rows shows so the page stays short. */}
        <MnemonicGrid words={masked ? words.slice(0, MASKED_PREVIEW) : words} masked={masked} cellTone='surface' />
        {masked && <Button label='Show phrase' tone='secondary' leadingIcon='eye' onPress={onReveal} testID='backup-reveal' />}
      </View>
      <InlineAlert tone='warning' title='Keep your words private' description='Anyone with these words can access your wallet.' />
      <Text variant='meta' color='secondary'>Write them down and keep them somewhere safe.</Text>
    </Screen>
  );
};
