import { isAppError } from '../../../src/core/errors';
import { BiometricOutcome, MemorySecureStore } from '../../../src/security/memory-secure-store';
import { SecureKey } from '../../../src/security/secure-keys';
import { BiometryKind, SecureAccessPolicy } from '../../../src/security/secure-store';

const capture = async (promise: Promise<unknown>): Promise<unknown> => promise.then(() => undefined, error => error);

describe('MemorySecureStore', () => {
  it('stores, reads, checks and removes device items', async () => {
    const store = new MemorySecureStore();

    await expect(store.getItem(SecureKey.VAULT)).resolves.toBeNull();
    await expect(store.hasItem(SecureKey.VAULT)).resolves.toBe(false);
    await store.setItem(SecureKey.VAULT, 'v');
    await expect(store.hasItem(SecureKey.VAULT)).resolves.toBe(true);
    await expect(store.getItem(SecureKey.VAULT)).resolves.toBe('v');
    await store.removeItem(SecureKey.VAULT);
    await expect(store.getItem(SecureKey.VAULT)).resolves.toBeNull();
  });

  it('device items stay readable regardless of biometric state', async () => {
    const store = new MemorySecureStore();

    store.biometryKind = null;
    store.biometricOutcome = BiometricOutcome.CANCEL;
    await store.setItem(SecureKey.VAULT, 'v', { policy: SecureAccessPolicy.DEVICE });
    await expect(store.getItem(SecureKey.VAULT)).resolves.toBe('v');
  });

  it('gates biometric items on availability and outcome', async () => {
    const store = new MemorySecureStore();

    await store.setItem(SecureKey.BIOMETRIC_PASSWORD, 'pw', { policy: SecureAccessPolicy.BIOMETRIC });
    await expect(store.getItem(SecureKey.BIOMETRIC_PASSWORD)).resolves.toBe('pw');

    store.biometricOutcome = BiometricOutcome.CANCEL;
    expect(isAppError(await capture(store.getItem(SecureKey.BIOMETRIC_PASSWORD)), 'BIOMETRICS_CANCELED')).toBe(true);

    store.biometryKind = null;
    expect(isAppError(await capture(store.getItem(SecureKey.BIOMETRIC_PASSWORD)), 'BIOMETRICS_UNAVAILABLE')).toBe(true);
  });

  it('reports the configured biometry kind', async () => {
    const store = new MemorySecureStore();

    await expect(store.getBiometryKind()).resolves.toBe(BiometryKind.FACE);
    store.biometryKind = BiometryKind.FINGERPRINT;
    await expect(store.getBiometryKind()).resolves.toBe(BiometryKind.FINGERPRINT);
  });
});
