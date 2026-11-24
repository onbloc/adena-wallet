import { SecureKey } from '../security/secure-keys';
import { BiometryKind, SecureAccessPolicy, SecurePrompt, SecureStore } from '../security/secure-store';

export interface BiometricCredentialRepository {
  getBiometryKind(): Promise<BiometryKind | null>;
  hasCredential(): Promise<boolean>;
  saveCredential(password: string, prompt?: SecurePrompt): Promise<void>;
  readCredential(prompt: SecurePrompt): Promise<string | null>;
  clear(): Promise<void>;
}

export class SecureBiometricCredentialRepository implements BiometricCredentialRepository {
  constructor(private readonly secureStore: SecureStore) {}

  getBiometryKind(): Promise<BiometryKind | null> {
    return this.secureStore.getBiometryKind();
  }

  hasCredential(): Promise<boolean> {
    return this.secureStore.hasItem(SecureKey.BIOMETRIC_PASSWORD);
  }

  saveCredential(password: string, prompt?: SecurePrompt): Promise<void> {
    return this.secureStore.setItem(SecureKey.BIOMETRIC_PASSWORD, password, { policy: SecureAccessPolicy.BIOMETRIC, prompt });
  }

  readCredential(prompt: SecurePrompt): Promise<string | null> {
    return this.secureStore.getItem(SecureKey.BIOMETRIC_PASSWORD, { prompt });
  }

  clear(): Promise<void> {
    return this.secureStore.removeItem(SecureKey.BIOMETRIC_PASSWORD);
  }
}
