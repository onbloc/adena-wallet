import { launchImageLibrary } from 'react-native-image-picker';
import { loadImage } from 'react-native-nitro-image';
import { createBarcodeScanner } from 'react-native-vision-camera-barcode-scanner';

import { AppError, AppErrorCode } from '../../core/errors';

// Lets the user pick a photo and returns the QR payloads found in it; null when canceled.
export const scanQrFromPhotos = async (): Promise<string[] | null> => {
  const response = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });

  if (response.didCancel) {
    return null;
  }

  const uri = response.assets?.[0]?.uri;

  if (response.errorCode || !uri) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, response.errorMessage ?? 'Could not load this photo');
  }

  const image = await loadImage({ filePath: uri });
  const scanner = createBarcodeScanner({ barcodeFormats: ['qr-code'] });

  try {
    const barcodes = await scanner.scanCodesInImageAsync(image);

    return barcodes.map(barcode => barcode.rawValue ?? barcode.displayValue).filter((value): value is string => Boolean(value));
  }
  finally {
    image.dispose();
    scanner.dispose();
  }
};
