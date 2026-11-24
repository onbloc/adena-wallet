import { CommonActions, useIsFocused } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet } from 'react-native';
import { Camera, CameraDevice, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { Barcode, TargetBarcodeFormat, useBarcodeScannerOutput } from 'react-native-vision-camera-barcode-scanner';

import { QrScannerPage, QrScannerStatus } from '../../../components/pages';
import { useContainer } from '../../../di/container-provider';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainStackParamList } from '../../../navigation/types';
import { parseRecipientQr } from '../../../utils/recipient-qr';

// Module constant: the scanner output is recreated whenever this array identity changes.
const QR_FORMATS: TargetBarcodeFormat[] = ['qr-code'];

interface ScannerCameraProps {
  device: CameraDevice;
  isActive: boolean;
  onScan: (barcodes: Barcode[]) => void;
  onError: (error: Error) => void;
}

const ScannerCamera = ({ device, isActive, onScan, onError }: ScannerCameraProps): ReactElement => {
  const output = useBarcodeScannerOutput({ barcodeFormats: QR_FORMATS, onBarcodeScanned: onScan, onError });

  return <Camera style={StyleSheet.absoluteFill} device={device} isActive={isActive} outputs={[output]} onError={onError} />;
};

export const QrScannerScreen = ({ navigation, route }: NativeStackScreenProps<MainStackParamList, 'QrScanner'>): ReactElement => {
  const { returnKey } = route.params;
  const { chainRegistry } = useContainer();
  const { network } = useWalletSnapshot();
  const permission = useCameraPermission();
  const device = useCameraDevice('back');
  const focused = useIsFocused();
  const [declined, setDeclined] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);
  const doneRef = useRef(false);
  const { canRequestPermission, requestPermission } = permission;

  useEffect(() => {
    if (!canRequestPermission) {
      return;
    }

    requestPermission()
      .then(granted => setDeclined(!granted))
      .catch(() => setDeclined(true));
  }, [canRequestPermission, requestPermission]);

  const isValidAddress = (address: string): boolean => chainRegistry.forNetwork(network).isValidAddress(address, network);

  // Codes keep arriving every frame; only the first valid one is used.
  const handleScan = (barcodes: Barcode[]): void => {
    if (doneRef.current) {
      return;
    }

    const payloads = barcodes.map(barcode => barcode.rawValue ?? barcode.displayValue).filter((value): value is string => Boolean(value));

    if (payloads.length === 0) {
      return;
    }

    const address = payloads.map(payload => parseRecipientQr(payload, isValidAddress)).find(Boolean);

    if (!address) {
      setError(`Not a valid ${network.chainName} address`);
      return;
    }

    doneRef.current = true;
    setDone(true);
    navigation.dispatch({ ...CommonActions.setParams({ scannedAddress: address }), source: returnKey });
    navigation.goBack();
  };

  const handleCameraError = (): void => setError('The camera stopped unexpectedly.');

  const handleOpenSettings = (): void => {
    Linking.openSettings().catch(() => undefined);
  };

  const denied = permission.status === 'denied' || permission.status === 'restricted' || declined;
  const status: QrScannerStatus = permission.hasPermission ? (device ? 'scanning' : 'no-device') : denied ? 'denied' : 'requesting';

  return (
    <QrScannerPage
      status={status}
      camera={device && permission.hasPermission
        ? <ScannerCamera device={device} isActive={focused && !done} onScan={handleScan} onError={handleCameraError} />
        : undefined}
      hint={`Scan a ${network.chainName} address QR code`}
      error={error}
      onOpenSettings={handleOpenSettings}
      onClose={navigation.goBack}
    />
  );
};
