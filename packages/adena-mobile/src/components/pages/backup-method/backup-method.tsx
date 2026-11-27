import React, { ReactElement, useState } from 'react';
import { View } from 'react-native';

import { Button } from '../../atoms';
import { BottomSheet, OptionCard, PageHeading, Screen, TopBar } from '../../molecules';
import { styles } from './backup-method.styles';

export interface BackupMethodPageProps {
  // e.g. "iCloud"; the cloud option is hidden without it.
  cloudProviderName?: string;
  onCloudBackup?: () => void;
  onManualBackup: () => void;
  onBackUpLater: () => void;
  onBack: () => void;
}

export const BackupMethodPage = ({ cloudProviderName, onCloudBackup, onManualBackup, onBackUpLater, onBack }: BackupMethodPageProps): ReactElement => {
  const [helpVisible, setHelpVisible] = useState(false);

  return (
    <Screen
      header={<TopBar onBack={onBack} />}
      footer={<Button label='Back up later' tone='tertiary' onPress={onBackUpLater} testID='backup-later' />}
    >
      <PageHeading
        eyebrow='Backup / Choose a method'
        title={'Back up your\nwallet.'}
        description='Choose a recovery plan so you can restore your wallet on a new device.'
      />
      <View style={styles.options}>
        {cloudProviderName && onCloudBackup && (
          <OptionCard icon='cloud' title={`${cloudProviderName} backup`} description='Save an encrypted backup with a password.' onPress={onCloudBackup} testID='backup-method-cloud' />
        )}
        <OptionCard icon='copy' title='Manual backup' description='Write down and store your recovery phrase.' onPress={onManualBackup} testID='backup-method-manual' />
      </View>
      <Button label='What is a recovery phrase?' tone='tertiary' onPress={() => setHelpVisible(true)} testID='backup-learn-more' />
      <BottomSheet
        visible={helpVisible}
        title='What is a recovery phrase?'
        description='A list of words that restores your wallet on any device. Anyone who has it can move your assets, and Adena cannot recover it for you.'
        onClose={() => setHelpVisible(false)}
      >
        <Button label='Got it' onPress={() => setHelpVisible(false)} />
      </BottomSheet>
    </Screen>
  );
};
