import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import React, {useEffect, useRef} from 'react';
import {StyleSheet, View} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';

import {isAddressForNetwork} from '../core/address';
import {useWallet} from '../core/wallet-context';
import type {MainStackParams} from '../navigation/types';
import {Body, Button, Screen} from '../ui/components';

type Props = NativeStackScreenProps<MainStackParams, 'QrScan'>;

/** Accepts a bare address or a `gno:` / `gnoland:` URI carrying one. */
export function addressFromQr(value: string): string {
  return value
    .trim()
    .replace(/^(gno|gnoland):(\/\/)?/i, '')
    .split(/[?#]/)[0];
}

export function QrScanScreen({navigation}: Props) {
  const {net} = useWallet();
  const {hasPermission, requestPermission} = useCameraPermission();
  const device = useCameraDevice('back');
  const handled = useRef(false);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: codes => {
      const value = codes[0]?.value;
      if (handled.current || !value) {
        return;
      }
      const candidate = addressFromQr(value);
      if (isAddressForNetwork(candidate, net?.network.addressPrefix ?? 'g')) {
        handled.current = true;
        navigation.navigate({
          name: 'Send',
          params: {scannedAddress: candidate},
          merge: true,
        });
      }
    },
  });

  if (!hasPermission || !device) {
    return (
      <Screen>
        <Body>Camera access is needed to scan a QR code.</Body>
        <Button title="Allow camera" onPress={requestPermission} />
      </Screen>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        codeScanner={codeScanner}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#000'},
});
