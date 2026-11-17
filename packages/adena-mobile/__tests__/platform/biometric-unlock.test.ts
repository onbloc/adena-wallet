import * as Keychain from 'react-native-keychain';

import {
  disableBiometricUnlock,
  enableBiometricUnlock,
  isBiometricUnlockEnabled,
} from '../../src/platform/biometric-unlock';

const keychain = Keychain as unknown as {
  __reset(): void;
  __items: Map<string, {options: any}>;
};

beforeEach(() => keychain.__reset());

describe('biometric unlock escrow', () => {
  it('is found again after it is enabled, and gone after it is disabled', async () => {
    await enableBiometricUnlock('Pw-Test-1234!');
    expect(await isBiometricUnlockEnabled()).toBe(true);

    await disableBiometricUnlock();
    expect(await isBiometricUnlockEnabled()).toBe(false);
  });

  it('keeps the escrow on this device behind the current biometrics', async () => {
    await enableBiometricUnlock('Pw-Test-1234!');
    const [item] = [...keychain.__items.values()];
    expect(item.options).toMatchObject({
      accessible: Keychain.ACCESSIBLE.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
    });
    // Any `cloudSync`, even false, turns iCloud sync on (see storage.ts).
    expect(item.options).not.toHaveProperty('cloudSync');
  });
});
