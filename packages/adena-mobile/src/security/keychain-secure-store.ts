import * as Keychain from 'react-native-keychain';

import { AppError, AppErrorCode } from '../core/errors';
import { SecureKey } from './secure-keys';
import { BiometryKind, SecureAccessPolicy, SecureReadOptions, SecureStore, SecureWriteOptions } from './secure-store';

const CANCEL_CODES = new Set<string>([
  Keychain.ERROR_CODE.AUTH_CANCELED,
  Keychain.ERROR_CODE.BIOMETRIC_TIMEOUT,
]);

const BIOMETRIC_UNAVAILABLE_CODES = new Set<string>([
  Keychain.ERROR_CODE.BIOMETRIC_NOT_ENROLLED,
  Keychain.ERROR_CODE.BIOMETRIC_UNAVAILABLE,
  Keychain.ERROR_CODE.BIOMETRIC_LOCKOUT,
  Keychain.ERROR_CODE.BIOMETRIC_LOCKOUT_PERMANENT,
  Keychain.ERROR_CODE.BIOMETRIC_TEMPORARILY_UNAVAILABLE,
  Keychain.ERROR_CODE.AUTH_INVALIDATED,
  Keychain.ERROR_CODE.PASSCODE_NOT_SET,
]);

const toAppError = (error: unknown): AppError => {
  const code = (error as { code?: string })?.code;

  if (code && CANCEL_CODES.has(code)) {
    return new AppError(AppErrorCode.BIOMETRICS_CANCELED, 'Authentication was canceled', { cause: error });
  }

  if (code && BIOMETRIC_UNAVAILABLE_CODES.has(code)) {
    return new AppError(AppErrorCode.BIOMETRICS_UNAVAILABLE, 'Biometric authentication is unavailable', { cause: error });
  }

  return new AppError(AppErrorCode.STORAGE_ERROR, 'Secure storage access failed', { cause: error });
};

const toBiometryKind = (type: Keychain.BIOMETRY_TYPE | null): BiometryKind | null => {
  switch (type) {
    case null:
      return null;
    case Keychain.BIOMETRY_TYPE.FACE_ID:
    case Keychain.BIOMETRY_TYPE.FACE:
      return BiometryKind.FACE;
    case Keychain.BIOMETRY_TYPE.TOUCH_ID:
    case Keychain.BIOMETRY_TYPE.FINGERPRINT:
      return BiometryKind.FINGERPRINT;
    case Keychain.BIOMETRY_TYPE.IRIS:
    case Keychain.BIOMETRY_TYPE.OPTIC_ID:
      return BiometryKind.IRIS;
    default:
      return BiometryKind.OTHER;
  }
};

export class KeychainSecureStore implements SecureStore {
  constructor(private readonly namespace: string) {}

  private service(key: SecureKey): string {
    return `${this.namespace}.${key}`;
  }

  async getItem(key: SecureKey, options?: SecureReadOptions): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: this.service(key),
        authenticationPrompt: options?.prompt,
      });

      return credentials ? credentials.password : null;
    }
    catch (error) {
      throw toAppError(error);
    }
  }

  async setItem(key: SecureKey, value: string, options?: SecureWriteOptions): Promise<void> {
    const biometric = options?.policy === SecureAccessPolicy.BIOMETRIC;

    try {
      // THIS_DEVICE_ONLY keeps secrets out of iCloud/device-transfer backups.
      const result = await Keychain.setGenericPassword(key, value, {
        service: this.service(key),
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        accessControl: biometric ? Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET : undefined,
        storage: biometric ? Keychain.STORAGE_TYPE.AES_GCM : Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
        authenticationPrompt: biometric ? options?.prompt : undefined,
      });

      if (!result) {
        throw new Error('setGenericPassword returned false');
      }
    }
    catch (error) {
      throw toAppError(error);
    }
  }

  async removeItem(key: SecureKey): Promise<void> {
    try {
      await Keychain.resetGenericPassword({ service: this.service(key) });
    }
    catch (error) {
      throw toAppError(error);
    }
  }

  async hasItem(key: SecureKey): Promise<boolean> {
    try {
      return await Keychain.hasGenericPassword({ service: this.service(key) });
    }
    catch (error) {
      throw toAppError(error);
    }
  }

  async getBiometryKind(): Promise<BiometryKind | null> {
    try {
      return toBiometryKind(await Keychain.getSupportedBiometryType());
    }
    catch {
      return null;
    }
  }
}
