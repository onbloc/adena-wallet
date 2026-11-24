import { AppError, AppErrorCode } from '../core/errors';
import { BIOMETRIC_VAULT_ERROR, Spec as BiometricVault } from '../native/NativeAdenaBiometricVault';
import { SecureKey } from '../security/secure-keys';
import { BiometryKind, SecurePrompt, SecureStore } from '../security/secure-store';
import { BiometricCredentialRepository } from './biometric-credential.repository';

const KEY_ALIAS = 'adena.biometric-password';
// Marks a vault-sealed value; anything else is a legacy keychain entry and is discarded.
const SEALED_PREFIX = 'bv1:';

const DEFAULT_SAVE_PROMPT: SecurePrompt = { title: 'Turn on biometric unlock', cancel: 'Cancel' };

const toAppError = (error: unknown): AppError => {
  switch ((error as { code?: string })?.code) {
    case BIOMETRIC_VAULT_ERROR.CANCELED:
      return new AppError(AppErrorCode.BIOMETRICS_CANCELED, 'Authentication was canceled', { cause: error });
    case BIOMETRIC_VAULT_ERROR.UNAVAILABLE:
      return new AppError(AppErrorCode.BIOMETRICS_UNAVAILABLE, 'Biometric authentication is unavailable', { cause: error });
    case BIOMETRIC_VAULT_ERROR.KEY_INVALIDATED:
      return new AppError(AppErrorCode.BIOMETRICS_UNAVAILABLE, 'Biometrics changed. Unlock with your password and turn biometric unlock on again.', { cause: error });
    default:
      return new AppError(AppErrorCode.STORAGE_ERROR, 'Secure storage access failed', { cause: error });
  }
};

// Android: react-native-keychain keys accept the device PIN and a 5s window, so a newly
// enrolled fingerprint could read the password. The vault key needs strong biometrics on every use.
export class AndroidBiometricCredentialRepository implements BiometricCredentialRepository {
  constructor(
    private readonly secureStore: SecureStore,
    private readonly vault: BiometricVault | null | undefined,
    private readonly savePrompt: SecurePrompt = DEFAULT_SAVE_PROMPT,
  ) {}

  async getBiometryKind(): Promise<BiometryKind | null> {
    return this.vault ? this.secureStore.getBiometryKind() : null;
  }

  hasCredential(): Promise<boolean> {
    return this.secureStore.hasItem(SecureKey.BIOMETRIC_PASSWORD);
  }

  async saveCredential(password: string, prompt: SecurePrompt = this.savePrompt): Promise<void> {
    const vault = this.requireVault();
    const { title, subtitle, cancel } = prompt;
    const sealed = await vault.seal(KEY_ALIAS, password, title, subtitle ?? '', cancel ?? 'Cancel').catch((error) => {
      throw toAppError(error);
    });

    await this.secureStore.setItem(SecureKey.BIOMETRIC_PASSWORD, `${SEALED_PREFIX}${sealed}`);
  }

  async readCredential(prompt: SecurePrompt): Promise<string | null> {
    const vault = this.requireVault();
    const stored = await this.secureStore.getItem(SecureKey.BIOMETRIC_PASSWORD);

    if (!stored) {
      return null;
    }

    if (!stored.startsWith(SEALED_PREFIX)) {
      await this.clear();
      return null;
    }

    try {
      return await vault.unseal(KEY_ALIAS, stored.slice(SEALED_PREFIX.length), prompt.title, prompt.subtitle ?? '', prompt.cancel ?? 'Cancel');
    }
    catch (error) {
      // The key is gone for good after an enrollment change; the stale ciphertext goes with it.
      if ((error as { code?: string })?.code === BIOMETRIC_VAULT_ERROR.KEY_INVALIDATED) {
        await this.clear();
      }

      throw toAppError(error);
    }
  }

  async clear(): Promise<void> {
    await this.secureStore.removeItem(SecureKey.BIOMETRIC_PASSWORD);
    await this.vault?.deleteKey(KEY_ALIAS).catch(() => undefined);
  }

  private requireVault(): BiometricVault {
    if (!this.vault) {
      throw new AppError(AppErrorCode.BIOMETRICS_UNAVAILABLE, 'Biometric authentication is unavailable');
    }

    return this.vault;
  }
}
