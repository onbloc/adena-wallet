import { Platform } from 'react-native';

import { BiometryKind } from '../security/secure-store';

export const getBiometryLabel = (kind: BiometryKind | null): string | undefined => {
  switch (kind) {
    case BiometryKind.FACE:
      return Platform.OS === 'ios' ? 'Face ID' : 'Face unlock';
    case BiometryKind.FINGERPRINT:
      return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
    case BiometryKind.IRIS:
    case BiometryKind.OTHER:
      return 'Biometrics';
    default:
      return undefined;
  }
};
