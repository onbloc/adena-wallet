import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

// Android-only: a Keystore AES-GCM key usable once per strong-biometric prompt and
// invalidated when biometrics are enrolled. Rejections carry BIOMETRIC_VAULT_ERROR codes.
export interface Spec extends TurboModule {
  // Replaces the key under `alias` and returns base64(iv || ciphertext) of `plaintext`.
  seal(alias: string, plaintext: string, title: string, subtitle: string, cancel: string): Promise<string>;
  unseal(alias: string, sealed: string, title: string, subtitle: string, cancel: string): Promise<string>;
  deleteKey(alias: string): Promise<void>;
}

export const BIOMETRIC_VAULT_ERROR = {
  CANCELED: 'E_CANCELED',
  UNAVAILABLE: 'E_UNAVAILABLE',
  KEY_INVALIDATED: 'E_KEY_INVALIDATED',
  FAILED: 'E_FAILED',
} as const;

export default TurboModuleRegistry.get<Spec>('AdenaBiometricVault');
