import { AppError, AppErrorCode, BIOMETRICS_INVALIDATED_MESSAGE } from '../core/errors';
import { BIOMETRIC_VAULT_ERROR, Spec as BiometricVault } from '../native/NativeAdenaBiometricVault';
import { SecureKey } from '../security/secure-keys';
import { BiometryKind, SecurePrompt, SecureStore } from '../security/secure-store';
import { BiometricCredentialRepository } from './biometric-credential.repository';

// Two key slots: a new key is sealed under the unused one, so a cancelled prompt keeps the old credential.
export const KEY_ALIASES = ['adena.biometric-password', 'adena.biometric-password.b'] as const;
// bv1: sealed with KEY_ALIASES[0]; bv2:<slot>: names the slot. Anything else is a legacy keychain entry.
const SEALED_PREFIX_V1 = 'bv1:';
const SEALED_PREFIX_V2 = 'bv2:';

interface SealedValue {
  slot: number;
  sealed: string;
}

const parseSealed = (stored: string): SealedValue | null => {
  if (stored.startsWith(SEALED_PREFIX_V1)) {
    return { slot: 0, sealed: stored.slice(SEALED_PREFIX_V1.length) };
  }

  const match = /^bv2:([01]):/.exec(stored);

  return match ? { slot: Number(match[1]), sealed: stored.slice(match[0].length) } : null;
};

const DEFAULT_SAVE_PROMPT: SecurePrompt = { title: 'Turn on biometric unlock', cancel: 'Cancel' };

const toAppError = (error: unknown): AppError => {
  switch ((error as { code?: string })?.code) {
    case BIOMETRIC_VAULT_ERROR.CANCELED:
      return new AppError(AppErrorCode.BIOMETRICS_CANCELED, 'Authentication was canceled', { cause: error });
    case BIOMETRIC_VAULT_ERROR.UNAVAILABLE:
      return new AppError(AppErrorCode.BIOMETRICS_UNAVAILABLE, 'Biometric authentication is unavailable', { cause: error });
    case BIOMETRIC_VAULT_ERROR.KEY_INVALIDATED:
      return new AppError(AppErrorCode.BIOMETRICS_INVALIDATED, BIOMETRICS_INVALIDATED_MESSAGE, { cause: error });
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
    const stored = await this.secureStore.getItem(SecureKey.BIOMETRIC_PASSWORD);
    const current = stored ? parseSealed(stored) : null;
    const slot = current?.slot === 0 ? 1 : 0;
    const sealed = await vault.seal(KEY_ALIASES[slot], password, title, subtitle ?? '', cancel ?? 'Cancel').catch((error) => {
      throw toAppError(error);
    });

    await this.secureStore.setItem(SecureKey.BIOMETRIC_PASSWORD, `${SEALED_PREFIX_V2}${slot}:${sealed}`);
    // Only now is the previous key unused.
    await vault.deleteKey(KEY_ALIASES[slot === 0 ? 1 : 0]).catch(() => undefined);
  }

  async readCredential(prompt: SecurePrompt): Promise<string | null> {
    const vault = this.requireVault();
    const stored = await this.secureStore.getItem(SecureKey.BIOMETRIC_PASSWORD);

    if (!stored) {
      return null;
    }

    const value = parseSealed(stored);

    if (!value) {
      await this.clear();
      return null;
    }

    try {
      return await vault.unseal(KEY_ALIASES[value.slot], value.sealed, prompt.title, prompt.subtitle ?? '', prompt.cancel ?? 'Cancel');
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
    await Promise.all(KEY_ALIASES.map(alias => this.vault?.deleteKey(alias).catch(() => undefined)));
  }

  private requireVault(): BiometricVault {
    if (!this.vault) {
      throw new AppError(AppErrorCode.BIOMETRICS_UNAVAILABLE, 'Biometric authentication is unavailable');
    }

    return this.vault;
  }
}
