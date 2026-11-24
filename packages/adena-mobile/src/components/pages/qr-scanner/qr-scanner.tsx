import React, { ReactElement, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconButton, Spinner, Text } from '../../atoms';
import { EmptyState, InlineAlert, Screen, TopBar } from '../../molecules';
import { styles } from './qr-scanner.styles';

export type QrScannerStatus = 'requesting' | 'scanning' | 'denied' | 'no-device';

export interface QrScannerPageProps {
  status: QrScannerStatus;
  // Camera preview rendered by the container; pages stay free of native modules.
  camera?: ReactNode;
  hint: string;
  error?: string;
  onOpenSettings: () => void;
  onClose: () => void;
}

const CloseButton = ({ onClose }: { onClose: () => void }): ReactElement => (
  <IconButton icon='close' variant='primary' accessibilityLabel='Close' size={36} onPress={onClose} />
);

export const QrScannerPage = ({ status, camera, hint, error, onOpenSettings, onClose }: QrScannerPageProps): ReactElement => {
  if (status === 'denied' || status === 'no-device') {
    return (
      <Screen header={<TopBar title='Scan QR code' trailing={<CloseButton onClose={onClose} />} />}>
        {status === 'denied'
          ? (
              <EmptyState
                title='Camera access needed'
                description='Allow camera access in Settings to scan a wallet address QR code.'
                actionLabel='Open settings'
                onAction={onOpenSettings}
              />
            )
          : <EmptyState title='No camera available' description='This device has no camera that can scan QR codes.' />}
      </Screen>
    );
  }

  return (
    <View style={styles.root} testID='qr-scanner'>
      {status === 'scanning' && <View style={StyleSheet.absoluteFill}>{camera}</View>}
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <IconButton icon='close' variant='surface' accessibilityLabel='Close' size={36} onPress={onClose} />
        </View>
        <View style={styles.center}>
          <View style={styles.frame}>
            {status === 'requesting' && <View style={styles.spinner}><Spinner tone='inverse' /></View>}
          </View>
          <Text variant='body' color='inverse' align='center'>{hint}</Text>
        </View>
        <View style={styles.footer}>
          {error && <InlineAlert tone='error' title={error} />}
        </View>
      </SafeAreaView>
    </View>
  );
};
