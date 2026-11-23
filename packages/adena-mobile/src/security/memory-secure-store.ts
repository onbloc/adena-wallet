import { AppError, AppErrorCode } from '../core/errors';
import { SecureKey } from './secure-keys';
import { BiometryKind, SecureAccessPolicy, SecureStore, SecureWriteOptions } from './secure-store';

// In-memory SecureStore for tests and previews.
export const BiometricOutcome = {
  SUCCESS: 'success',
  CANCEL: 'cancel',
} as const;

export type BiometricOutcome = (typeof BiometricOutcome)[keyof typeof BiometricOutcome];

export class MemorySecureStore implements SecureStore {
  private readonly items = new Map<SecureKey, { value: string; policy: SecureAccessPolicy }>();

  biometryKind: BiometryKind | null = BiometryKind.FACE;
  biometricOutcome: BiometricOutcome = BiometricOutcome.SUCCESS;

  async getItem(key: SecureKey): Promise<string | null> {
    const item = this.items.get(key);

    if (!item) {
      return null;
    }

    if (item.policy === SecureAccessPolicy.BIOMETRIC) {
      if (!this.biometryKind) {
        throw new AppError(AppErrorCode.BIOMETRICS_UNAVAILABLE);
      }

      if (this.biometricOutcome === BiometricOutcome.CANCEL) {
        throw new AppError(AppErrorCode.BIOMETRICS_CANCELED);
      }
    }

    return item.value;
  }

  async setItem(key: SecureKey, value: string, options?: SecureWriteOptions): Promise<void> {
    this.items.set(key, { value, policy: options?.policy ?? SecureAccessPolicy.DEVICE });
  }

  async removeItem(key: SecureKey): Promise<void> {
    this.items.delete(key);
  }

  async hasItem(key: SecureKey): Promise<boolean> {
    return this.items.has(key);
  }

  async getBiometryKind(): Promise<BiometryKind | null> {
    return this.biometryKind;
  }
}
