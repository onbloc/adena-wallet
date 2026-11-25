import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Button, Text } from '../../atoms';
import { Screen } from '../../molecules';
import { styles } from './welcome.styles';

export interface WelcomePageProps {
  onCreateWallet: () => void;
  onImportWallet: () => void;
}

export const WelcomePage = ({ onCreateWallet, onImportWallet }: WelcomePageProps): ReactElement => (
  <Screen
    scrollable={false}
    footer={(
      <>
        <Button label='Create a new wallet' onPress={onCreateWallet} testID='welcome-create' />
        <Button label='Import with recovery phrase' tone='secondary' onPress={onImportWallet} testID='welcome-import' />
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
