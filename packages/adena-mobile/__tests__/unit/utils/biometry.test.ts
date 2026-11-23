import { Platform } from 'react-native';

import { BiometryKind } from '../../../src/security/secure-store';
import { getBiometryLabel } from '../../../src/utils/biometry';

const setOS = (os: 'ios' | 'android'): void => {
  Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
};

describe('getBiometryLabel', () => {
  const original = Platform.OS;

  afterEach(() => setOS(original as 'ios' | 'android'));

  it('uses Apple names on iOS', () => {
    setOS('ios');
    expect(getBiometryLabel(BiometryKind.FACE)).toBe('Face ID');
    expect(getBiometryLabel(BiometryKind.FINGERPRINT)).toBe('Touch ID');
  });

  it('uses generic names on Android', () => {
    setOS('android');
    expect(getBiometryLabel(BiometryKind.FACE)).toBe('Face unlock');
    expect(getBiometryLabel(BiometryKind.FINGERPRINT)).toBe('Fingerprint');
  });

  it('labels iris and other kinds as Biometrics', () => {
    expect(getBiometryLabel(BiometryKind.IRIS)).toBe('Biometrics');
    expect(getBiometryLabel(BiometryKind.OTHER)).toBe('Biometrics');
  });

  it('returns undefined without biometrics', () => {
    expect(getBiometryLabel(null)).toBeUndefined();
    expect(getBiometryLabel('unknown' as BiometryKind)).toBeUndefined();
  });
});
