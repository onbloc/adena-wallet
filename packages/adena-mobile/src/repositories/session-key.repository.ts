import { AppError, AppErrorCode } from '../core/errors';
import { sessionCardSecureKey } from '../security/secure-keys';
import { SecureAccessPolicy, SecurePrompt, SecureStore } from '../security/secure-store';

export const SESSION_KEY_WRITE_PROMPT: SecurePrompt = {
  title: 'Protect your card key',
  subtitle: 'Confirm to store the key on this device',
  cancel: 'Cancel',
};

export const BIOMETRICS_REQUIRED_FOR_CARDS_MESSAGE = 'Set up Face ID or fingerprint on this device to issue cards.';

// Card private keys. Each is biometric-bound and kept on this device only, outside backups.
export class SessionKeyRepository {
  constructor(private readonly secureStore: SecureStore) {}

  async assertAvailable(): Promise<void> {
    if (!await this.secureStore.getBiometryKind()) {
      throw new AppError(AppErrorCode.BIOMETRICS_UNAVAILABLE, BIOMETRICS_REQUIRED_FOR_CARDS_MESSAGE);
    }
  }

  async save(sessionAddress: string, privateKeyHex: string): Promise<void> {
    await this.secureStore.setItem(sessionCardSecureKey(sessionAddress), privateKeyHex, {
      policy: SecureAccessPolicy.BIOMETRIC,
      prompt: SESSION_KEY_WRITE_PROMPT,
    });
  }

  has(sessionAddress: string): Promise<boolean> {
    return this.secureStore.hasItem(sessionCardSecureKey(sessionAddress));
  }

  remove(sessionAddress: string): Promise<void> {
    return this.secureStore.removeItem(sessionCardSecureKey(sessionAddress));
  }
}
