import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Button, Checkbox, Text } from '../../atoms';
import { InlineAlert, MnemonicGrid, Screen, TopBar } from '../../molecules';
import { styles } from './backup-phrase.styles';

export interface BackupPhrasePageProps {
  words: string[];
  // Masked while the app was in the background, so the app-switcher snapshot holds no words.
  hidden?: boolean;
  onReveal?: () => void;
  acknowledged: boolean;
  onToggleAcknowledged: (value: boolean) => void;
  onContinue: () => void;
  onBack: () => void;
}

export const BackupPhrasePage = ({ words, hidden = false, onReveal, acknowledged, onToggleAcknowledged, onContinue, onBack }: BackupPhrasePageProps): ReactElement => (
  <Screen
    header={<TopBar title='Recovery phrase' onBack={onBack} />}
    footer={<Button label='Continue' disabled={!acknowledged} onPress={onContinue} testID='backup-continue' />}
  >
    <Text variant='body' color='secondary'>Write these words down in order and keep them offline. Anyone with this phrase can move your assets.</Text>
    {hidden
      ? (
          <View style={styles.masked} testID='backup-phrase-masked'>
            <Text variant='body' color='secondary'>Your recovery phrase is hidden.</Text>
            <Button label='Show phrase' tone='secondary' leadingIcon='eye' fullWidth={false} onPress={onReveal} testID='backup-reveal' />
          </View>
        )
      : <MnemonicGrid words={words} />}
    <InlineAlert tone='warning' title='Never share this phrase' description='Adena will never ask for it. Screenshots and cloud notes are not safe places.' />
    <Checkbox label='I saved my recovery phrase' value={acknowledged ? 'on' : 'off'} onChange={onToggleAcknowledged} />
  </Screen>
);
