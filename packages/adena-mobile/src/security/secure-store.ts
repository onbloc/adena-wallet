import { SecureKey } from './secure-keys';

// device: readable while the device is unlocked. biometric: every read requires biometrics.
export const SecureAccessPolicy = {
  DEVICE: 'device',
  BIOMETRIC: 'biometric',
} as const;

export type SecureAccessPolicy = (typeof SecureAccessPolicy)[keyof typeof SecureAccessPolicy];

export const BiometryKind = {
  FACE: 'face',
  FINGERPRINT: 'fingerprint',
  IRIS: 'iris',
  OTHER: 'other',
} as const;

export type BiometryKind = (typeof BiometryKind)[keyof typeof BiometryKind];

export interface SecurePrompt {
  title: string;
  subtitle?: string;
  cancel?: string;
}

export interface SecureWriteOptions {
  policy?: SecureAccessPolicy;
  // Android asks for biometrics when it encrypts a biometric item; iOS ignores this on write.
  prompt?: SecurePrompt;
}

export interface SecureReadOptions {
  prompt?: SecurePrompt;
}

// Security access object: the only gateway to keychain/keystore items.
export interface SecureStore {
  getItem(key: SecureKey, options?: SecureReadOptions): Promise<string | null>;
  setItem(key: SecureKey, value: string, options?: SecureWriteOptions): Promise<void>;
  removeItem(key: SecureKey): Promise<void>;
  hasItem(key: SecureKey): Promise<boolean>;
  getBiometryKind(): Promise<BiometryKind | null>;
}
