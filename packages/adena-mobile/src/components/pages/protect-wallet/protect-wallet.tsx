import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { useThemeColors } from '../../../theme';
import { Button, Icon, Text } from '../../atoms';
import { InlineAlert, PageHeading, Screen, TopBar } from '../../molecules';
import { useStyles } from './protect-wallet.styles';

export interface ProtectWalletPageProps {
  eyebrow?: string;
  // e.g. "Face ID" or "Fingerprint".
  biometryLabel: string;
  onEnable: () => void;
  onSkip: () => void;
  onBack: () => void;
}

export const ProtectWalletPage = ({ eyebrow, biometryLabel, onEnable, onSkip, onBack }: ProtectWalletPageProps): ReactElement => {
  const styles = useStyles();
  const colors = useThemeColors();

  return (
    <Screen
      header={<TopBar onBack={onBack} />}
      footer={(
        <>
          <Button label={`Enable ${biometryLabel}`} onPress={onEnable} testID='protect-enable' />
          <Button label='Not now' tone='tertiary' onPress={onSkip} testID='protect-skip' />
        </>
      )}
    >
      <PageHeading eyebrow={eyebrow} title={'Protect your\nwallet.'} description='Add an extra layer of security when you approve transactions.' />
      <View style={styles.hero}>
        <View style={styles.badge}>
          <Icon name='shield' size={28} color={colors.icon.primary} />
        </View>
        <Text variant='section'>{biometryLabel}</Text>
      </View>
      <InlineAlert tone='info' title={`Approve with ${biometryLabel}`} description='Use your device to unlock Adena and confirm transactions.' />
    </Screen>
  );
};
