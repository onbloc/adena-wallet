import React, { ReactElement } from 'react';

import { Button, Checkbox, Text } from '../../atoms';
import { InlineAlert, MnemonicGrid, Screen, TopBar } from '../../molecules';

export interface BackupPhrasePageProps {
  words: string[];
  acknowledged: boolean;
  onToggleAcknowledged: (value: boolean) => void;
  onContinue: () => void;
  onBack: () => void;
}

export const BackupPhrasePage = ({ words, acknowledged, onToggleAcknowledged, onContinue, onBack }: BackupPhrasePageProps): ReactElement => (
  <Screen
    header={<TopBar title='Recovery phrase' onBack={onBack} />}
    footer={<Button label='Continue' disabled={!acknowledged} onPress={onContinue} testID='backup-continue' />}
  >
    <Text variant='body' color='secondary'>Write these words down in order and keep them offline. Anyone with this phrase can move your assets.</Text>
    <MnemonicGrid words={words} />
    <InlineAlert tone='warning' title='Never share this phrase' description='Adena will never ask for it. Screenshots and cloud notes are not safe places.' />
    <Checkbox label='I saved my recovery phrase' value={acknowledged ? 'on' : 'off'} onChange={onToggleAcknowledged} />
  </Screen>
);
