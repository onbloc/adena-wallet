import { CommonActions, useIsFocused } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet } from 'react-native';
import { Camera, CameraDevice, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { Barcode, TargetBarcodeFormat, useBarcodeScannerOutput } from 'react-native-vision-camera-barcode-scanner';

import { QrScannerPage, QrScannerStatus } from '../../../components/pages';
import { toErrorMessage } from '../../../core/error-message';
import { useContainer } from '../../../di/container-provider';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { scanQrFromPhotos } from '../../../infrastructure/media/qr-image-scanner';
import { MainStackParamList } from '../../../navigation/types';
import { useToastStore } from '../../../stores/toast.store';
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

  // TextureView preview so the rounded viewfinder also clips it on Android.
  return <Camera style={StyleSheet.absoluteFill} device={device} isActive={isActive} outputs={[output]} onError={onError} implementationMode='compatible' />;
};

export const QrScannerScreen = ({ navigation, route }: NativeStackScreenProps<MainStackParamList, 'QrScanner'>): ReactElement => {
  const returnKey = route.params?.returnKey;
  const { chainRegistry } = useContainer();
  const { network } = useWalletSnapshot();
  const showToast = useToastStore(state => state.show);
  const permission = useCameraPermission();
  const device = useCameraDevice('back');
  const focused = useIsFocused();
  const [declined, setDeclined] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);
  const doneRef = useRef(false);
  // The live camera pauses while a photo is picked and decoded, so it cannot replace the photo's result.
  const [photoPending, setPhotoPending] = useState(false);
  const photoPendingRef = useRef(false);
  // Bumped when the user leaves, so a photo result that settles afterwards is dropped.
  const photoRequestRef = useRef(0);
  const latestPhotoRef = useRef(0);
  const { canRequestPermission, requestPermission } = permission;

  useEffect(() => {
    if (!canRequestPermission) {
      return;
    }

    requestPermission()
      .then(granted => setDeclined(!granted))
      .catch(() => setDeclined(true));
  }, [canRequestPermission, requestPermission]);

  // Leaving the screen (blur or unmount) invalidates a photo request still being decoded.
  useEffect(() => {
    if (!focused) {
      photoRequestRef.current += 1;
    }
  }, [focused]);

  useEffect(() => (): void => {
    photoRequestRef.current += 1;
  }, []);

  const normalizeAddress = (address: string): string | null => chainRegistry.forNetwork(network).normalizeAddress(address, network);

  // Codes keep arriving every frame; only the first valid one is used.
  const handlePayloads = (payloads: string[]): void => {
    if (doneRef.current || payloads.length === 0) {
      return;
    }

    const result = payloads.map(payload => parseRecipientQr(payload, network, normalizeAddress)).find(Boolean);

    if (!result) {
      setError(`Not a valid ${network.chainName} address`);
      return;
    }

    const { address } = result;

    doneRef.current = true;
    setDone(true);

    if (result.ignoredParams) {
      showToast('Only the address from this QR code was used.', 'info');
    }

    if (!returnKey) {
      navigation.replace('SendRecipient', { scannedAddress: address });
      return;
    }

    navigation.dispatch({ ...CommonActions.setParams({ scannedAddress: address }), source: returnKey });
    navigation.goBack();
  };

  const handleScan = (barcodes: Barcode[]): void => {
    if (photoPendingRef.current) {
      return;
    }

    handlePayloads(barcodes.map(barcode => barcode.rawValue ?? barcode.displayValue).filter((value): value is string => Boolean(value)));
  };

  const handleFromPhotos = async (): Promise<void> => {
    if (photoPendingRef.current || doneRef.current) {
      return;
    }

    const request = ++photoRequestRef.current;
    const isCurrent = (): boolean => request === photoRequestRef.current;

    latestPhotoRef.current = request;
    photoPendingRef.current = true;
    setPhotoPending(true);
    setError(undefined);

    try {
      const payloads = await scanQrFromPhotos();

      if (!isCurrent() || payloads === null) {
        return;
      }

      if (payloads.length === 0) {
        setError('No QR code found in this photo');
        return;
      }

      handlePayloads(payloads);
    }
    catch (photoError) {
      if (isCurrent()) {
        setError(toErrorMessage(photoError));
      }
    }
    finally {
      // Cleared even when the result was dropped, unless a newer photo request is running.
      if (latestPhotoRef.current === request) {
        photoPendingRef.current = false;
        setPhotoPending(false);
      }
    }
  };

  const handleShowMyQr = (): void => navigation.replace('Receive');

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
        ? <ScannerCamera device={device} isActive={focused && !done && !photoPending} onScan={handleScan} onError={handleCameraError} />
        : undefined}
      hint={`${network.chainName} wallet address`}
      error={error}
      onOpenSettings={handleOpenSettings}
      onFromPhotos={handleFromPhotos}
      onShowMyQr={handleShowMyQr}
      onClose={navigation.goBack}
    />
  );
};
