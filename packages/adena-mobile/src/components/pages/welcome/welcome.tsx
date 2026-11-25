import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Button, Text } from '../../atoms';
import { Screen } from '../../molecules';
import { styles } from './welcome.styles';

export interface WelcomePageProps {
  onCreateWallet: () => void;
  onImportWallet: () => void;
  // Shown only when a cloud backup may be restored, e.g. "Restore from iCloud".
  restoreLabel?: string;
  onRestore?: () => void;
}

export const WelcomePage = ({ onCreateWallet, onImportWallet, restoreLabel, onRestore }: WelcomePageProps): ReactElement => (
  <Screen
    scrollable={false}
    footer={(
      <>
        <Button label='Create a new wallet' onPress={onCreateWallet} testID='welcome-create' />
        <Button label='Import with recovery phrase' tone='secondary' onPress={onImportWallet} testID='welcome-import' />
        {restoreLabel && onRestore && <Button label={restoreLabel} tone='tertiary' onPress={onRestore} testID='welcome-restore' />}
      </>
    )}
  >
    <View style={styles.hero}>
      <Text variant='display'>Adena</Text>
      <Text variant='title'>
        Numbers lead.
        {'\n'}
        Actions follow.
      </Text>
      <Text variant='body' color='secondary'>A clear wallet for Gno.land and connected chains.</Text>
    </View>
  </Screen>
);
