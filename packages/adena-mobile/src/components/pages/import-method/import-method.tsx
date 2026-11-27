import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { Text } from '../../atoms';
import { InlineAlert, OptionCard, PageHeading, Screen, TopBar } from '../../molecules';
import { styles } from './import-method.styles';

export interface ImportMethodPageProps {
  onRecoveryPhrase: () => void;
  // e.g. "iCloud"; the cloud option is hidden without it.
  cloudProviderName?: string;
  onCloudBackup?: () => void;
  onBack: () => void;
}

export const ImportMethodPage = ({ onRecoveryPhrase, cloudProviderName, onCloudBackup, onBack }: ImportMethodPageProps): ReactElement => (
  <Screen
    header={<TopBar onBack={onBack} />}
    footer={<Text variant='meta' color='secondary' align='center' style={styles.hint}>Choose a method to continue.</Text>}
  >
    <PageHeading eyebrow='Import wallet' title={'Bring your\nwallet.'} description='Choose how you want to restore your existing wallet.' />
    <View style={styles.options}>
      <OptionCard icon='copy' title='Recovery phrase' description='Import using your secret recovery words.' onPress={onRecoveryPhrase} testID='import-method-phrase' />
      {cloudProviderName && onCloudBackup && (
        <OptionCard icon='cloud' title={`${cloudProviderName} backup`} description='Restore from your encrypted cloud backup.' onPress={onCloudBackup} testID='import-method-cloud' />
      )}
    </View>
    <InlineAlert tone='info' title='Your wallet stays yours' description='Your recovery phrase is stored on your device.' />
  </Screen>
);
