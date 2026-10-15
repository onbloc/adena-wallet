import * as Keychain from 'react-native-keychain';

const BIOMETRIC_SERVICE = 'adena.mobile.biometric-unlock';

/**
 * Biometric unlock escrows the wallet password under a key that the OS
 * releases only after a biometric check with the currently enrolled set
 * (iOS `.biometryCurrentSet`, Android Keystore AES-GCM with user
 * authentication). Enrolling a new fingerprint or face invalidates the key,
 * so the user falls back to typing the password. Device passcode is not
 * accepted as a substitute.
 */
const ESCROW_OPTIONS = {
  service: BIOMETRIC_SERVICE,
  accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
  accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
  securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
  storage: Keychain.STORAGE_TYPE.AES_GCM,
  cloudSync: false,
};

export async function isBiometricUnlockAvailable(): Promise<boolean> {
  const biometry = await Keychain.getSupportedBiometryType();
  return biometry !== null;
}

export async function enableBiometricUnlock(password: string): Promise<void> {
  const result = await Keychain.setGenericPassword(
    'adena',
    password,
    ESCROW_OPTIONS,
  );
  if (result === false) {
    throw new Error('Could not enable biometric unlock');
  }
}

export async function disableBiometricUnlock(): Promise<void> {
  await Keychain.resetGenericPassword({service: BIOMETRIC_SERVICE});
}

export async function isBiometricUnlockEnabled(): Promise<boolean> {
  return Keychain.hasGenericPassword({service: BIOMETRIC_SERVICE});
}

/**
 * Returns the escrowed password, or `null` when the user cancelled or the key
 * was invalidated. An invalidated escrow is removed so the app stops offering
 * biometrics until the user re-enables it with the password.
 */
export async function unlockWithBiometrics(
  promptTitle: string,
): Promise<string | null> {
  try {
    const credentials = await Keychain.getGenericPassword({
      service: BIOMETRIC_SERVICE,
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
      authenticationPrompt: {title: promptTitle},
    });
    return credentials ? credentials.password : null;
  } catch (error) {
    if (await Keychain.hasGenericPassword({service: BIOMETRIC_SERVICE})) {
      const message = String((error as Error)?.message ?? error).toLowerCase();
      const cancelled = message.includes('cancel');
      if (!cancelled) {
        await disableBiometricUnlock();
      }
    }
    return null;
  }
}
