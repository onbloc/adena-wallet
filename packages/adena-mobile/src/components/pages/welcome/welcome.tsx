import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Button, Text } from '../../atoms';
import { PageHeading, Screen } from '../../molecules';
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
        <Button label='Create a wallet' onPress={onCreateWallet} testID='welcome-create' />
        <Button label='Import a wallet' tone='secondary' onPress={onImportWallet} testID='welcome-import' />
      </>
    )}
  >
    <View style={styles.brand}>
      <Text variant='title' style={styles.wordmark} accessibilityRole='header'>ADENA</Text>
    </View>
    <PageHeading
      eyebrow='Welcome to Adena'
      title={'Your wallet.\nYour world.'}
      description={'Tokens, NFTs and apps.\nAll in one place.'}
    />
  </Screen>
);
