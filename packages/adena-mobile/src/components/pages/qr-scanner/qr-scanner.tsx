import React, { ReactElement, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Spinner, Text } from '../../atoms';
import { EmptyState, InlineAlert, Screen, TopBar } from '../../molecules';
import { styles } from './qr-scanner.styles';

export type QrScannerStatus = 'requesting' | 'scanning' | 'denied' | 'no-device';

export interface QrScannerPageProps {
  status: QrScannerStatus;
  // Camera preview rendered by the container; pages stay free of native modules.
  camera?: ReactNode;
  // Short label inside the viewfinder naming what can be scanned.
  hint: string;
  error?: string;
  onOpenSettings: () => void;
  // Decodes a QR code from a saved photo instead of the camera.
  onFromPhotos?: () => void;
  onShowMyQr?: () => void;
  onClose: () => void;
}

const CORNERS = [
  { key: 'top-left', style: styles.topLeft },
  { key: 'top-right', style: styles.topRight },
  { key: 'bottom-left', style: styles.bottomLeft },
  { key: 'bottom-right', style: styles.bottomRight },
];

export const QrScannerPage = ({ status, camera, hint, error, onOpenSettings, onFromPhotos, onShowMyQr, onClose }: QrScannerPageProps): ReactElement => (
  <Screen
    header={<TopBar title='Scan QR code' variant='root' onBack={onClose} />}
    footer={onShowMyQr && <Button label='Show my QR code' onPress={onShowMyQr} />}
  >
    {status === 'denied' && (
      <EmptyState
        title='Camera access needed'
        description='Allow camera access in Settings to scan a wallet address QR code.'
        actionLabel='Open settings'
        onAction={onOpenSettings}
      />
    )}
    {status === 'no-device' && <EmptyState title='No camera available' description='This device has no camera that can scan QR codes.' />}
    {(status === 'scanning' || status === 'requesting') && (
      <>
        <View style={styles.viewport} testID='qr-scanner'>
          {status === 'scanning' && <View style={StyleSheet.absoluteFill}>{camera}</View>}
          <View style={styles.frame}>
            {CORNERS.map(corner => <View key={corner.key} style={[styles.corner, corner.style]} />)}
            {status === 'requesting'
              ? <View style={styles.spinner}><Spinner tone='inverse' /></View>
              : <View style={styles.scanLine} />}
          </View>
          <Text variant='meta' color='inverse' align='center'>{hint}</Text>
        </View>
        <Text variant='body' color='secondary' align='center'>Point your camera at a QR code to scan a wallet address.</Text>
      </>
    )}
    {onFromPhotos && <Button label='From photos' leadingIcon='image' tone='secondary' size='compact' onPress={onFromPhotos} testID='qr-from-photos' />}
    {error && <InlineAlert tone='error' title={error} />}
  </Screen>
);
