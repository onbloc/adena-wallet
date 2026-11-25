import * as Keychain from 'react-native-keychain';

import { isAppError } from '../../../src/core/errors';
import { KeychainSecureStore } from '../../../src/security/keychain-secure-store';
import { SecureKey } from '../../../src/security/secure-keys';
import { BiometryKind, SecureAccessPolicy } from '../../../src/security/secure-store';

jest.mock('react-native-keychain', () => {
  const enums = jest.requireActual('react-native-keychain/src/enums');
  const items = new Map<string, { username: string; password: string }>();

  return {
    ...enums,
    __items: items,
    getGenericPassword: jest.fn(async ({ service }: { service: string }) => {
      const item = items.get(service);

      return item ? { service, ...item, storage: 'x' } : false;
    }),
    setGenericPassword: jest.fn(async (username: string, password: string, { service }: { service: string }) => {
      items.set(service, { username, password });
      return { service, storage: 'x' };
    }),
    resetGenericPassword: jest.fn(async ({ service }: { service: string }) => items.delete(service)),
    hasGenericPassword: jest.fn(async ({ service }: { service: string }) => items.has(service)),
    getSupportedBiometryType: jest.fn(async () => null),
  };
});

const mocked = Keychain as unknown as {
  __items: Map<string, unknown>;
  getGenericPassword: jest.Mock;
  setGenericPassword: jest.Mock;
  resetGenericPassword: jest.Mock;
  hasGenericPassword: jest.Mock;
  getSupportedBiometryType: jest.Mock;
};

const capture = async (promise: Promise<unknown>): Promise<unknown> => promise.then(() => undefined, error => error);

describe('KeychainSecureStore', () => {
  const store = new KeychainSecureStore('ns');

  beforeEach(() => {
    mocked.__items.clear();
    jest.clearAllMocks();
  });

  it('returns null when no item exists and the stored password otherwise', async () => {
    await expect(store.getItem(SecureKey.VAULT)).resolves.toBeNull();
    await store.setItem(SecureKey.VAULT, 'secret');
    await expect(store.getItem(SecureKey.VAULT, { prompt: { title: 'Unlock' } })).resolves.toBe('secret');
    expect(mocked.getGenericPassword).toHaveBeenLastCalledWith({ service: 'ns.vault', authenticationPrompt: { title: 'Unlock' } });
  });

  it('stores device items without access control and the no-auth storage type', async () => {
    await store.setItem(SecureKey.VAULT, 'v');
    expect(mocked.setGenericPassword).toHaveBeenCalledWith('vault', 'v', {
      service: 'ns.vault',
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      accessControl: undefined,
      storage: Keychain.STORAGE_TYPE.AES_GCM_NO_AUTH,
    });
  });

  it('stores biometric items with the current biometry set', async () => {
    await store.setItem(SecureKey.BIOMETRIC_PASSWORD, 'pw', { policy: SecureAccessPolicy.BIOMETRIC });
    expect(mocked.setGenericPassword).toHaveBeenCalledWith('biometric-password', 'pw', expect.objectContaining({
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
      storage: Keychain.STORAGE_TYPE.AES_GCM,
    }));
  });

  it('passes the prompt only for biometric writes', async () => {
    const prompt = { title: 'Enable biometric unlock', subtitle: 'Confirm', cancel: 'Not now' };

    await store.setItem(SecureKey.BIOMETRIC_PASSWORD, 'pw', { policy: SecureAccessPolicy.BIOMETRIC, prompt });
    expect(mocked.setGenericPassword).toHaveBeenLastCalledWith('biometric-password', 'pw', expect.objectContaining({ authenticationPrompt: prompt }));

    await store.setItem(SecureKey.VAULT, 'v', { prompt });
    expect(mocked.setGenericPassword.mock.lastCall?.[2].authenticationPrompt).toBeUndefined();
  });

  it('treats a false write result as a storage error', async () => {
    mocked.setGenericPassword.mockResolvedValueOnce(false);
    const error = await capture(store.setItem(SecureKey.VAULT, 'v'));

    expect(isAppError(error, 'STORAGE_ERROR')).toBe(true);
  });

  it('removes items and reports presence', async () => {
    await store.setItem(SecureKey.VAULT, 'v');
    await expect(store.hasItem(SecureKey.VAULT)).resolves.toBe(true);
    await store.removeItem(SecureKey.VAULT);
    await expect(store.hasItem(SecureKey.VAULT)).resolves.toBe(false);
    expect(mocked.resetGenericPassword).toHaveBeenCalledWith({ service: 'ns.vault' });
  });

  it.each([
    [Keychain.ERROR_CODE.AUTH_CANCELED, 'BIOMETRICS_CANCELED'],
    [Keychain.ERROR_CODE.BIOMETRIC_TIMEOUT, 'BIOMETRICS_CANCELED'],
    [Keychain.ERROR_CODE.BIOMETRIC_NOT_ENROLLED, 'BIOMETRICS_UNAVAILABLE'],
    [Keychain.ERROR_CODE.BIOMETRIC_UNAVAILABLE, 'BIOMETRICS_UNAVAILABLE'],
    [Keychain.ERROR_CODE.BIOMETRIC_LOCKOUT, 'BIOMETRICS_UNAVAILABLE'],
    [Keychain.ERROR_CODE.BIOMETRIC_LOCKOUT_PERMANENT, 'BIOMETRICS_UNAVAILABLE'],
    [Keychain.ERROR_CODE.BIOMETRIC_TEMPORARILY_UNAVAILABLE, 'BIOMETRICS_UNAVAILABLE'],
    [Keychain.ERROR_CODE.AUTH_INVALIDATED, 'BIOMETRICS_INVALIDATED'],
    [Keychain.ERROR_CODE.PASSCODE_NOT_SET, 'BIOMETRICS_UNAVAILABLE'],
    [Keychain.ERROR_CODE.INTERNAL_ERROR, 'STORAGE_ERROR'],
  ] as const)('maps read error %s to %s', async (code, expected) => {
    const cause = Object.assign(new Error('native'), { code });

    mocked.getGenericPassword.mockRejectedValueOnce(cause);
    const error = await capture(store.getItem(SecureKey.VAULT));

    expect(isAppError(error, expected)).toBe(true);
    expect((error as { cause?: unknown }).cause).toBe(cause);
  });

  it('maps code-less and non-object failures to STORAGE_ERROR', async () => {
    mocked.getGenericPassword.mockRejectedValueOnce(new Error('boom'));
    expect(isAppError(await capture(store.getItem(SecureKey.VAULT)), 'STORAGE_ERROR')).toBe(true);
    mocked.getGenericPassword.mockRejectedValueOnce(undefined);
    expect(isAppError(await capture(store.getItem(SecureKey.VAULT)), 'STORAGE_ERROR')).toBe(true);
  });

  it('wraps failures of write, remove and has', async () => {
    mocked.setGenericPassword.mockRejectedValueOnce({ code: Keychain.ERROR_CODE.AUTH_CANCELED });
    mocked.resetGenericPassword.mockRejectedValueOnce(new Error('x'));
    mocked.hasGenericPassword.mockRejectedValueOnce(new Error('x'));

    expect(isAppError(await capture(store.setItem(SecureKey.VAULT, 'v')), 'BIOMETRICS_CANCELED')).toBe(true);
    expect(isAppError(await capture(store.removeItem(SecureKey.VAULT)), 'STORAGE_ERROR')).toBe(true);
    expect(isAppError(await capture(store.hasItem(SecureKey.VAULT)), 'STORAGE_ERROR')).toBe(true);
  });

  it.each([
    [null, null],
    [Keychain.BIOMETRY_TYPE.FACE_ID, BiometryKind.FACE],
    [Keychain.BIOMETRY_TYPE.FACE, BiometryKind.FACE],
    [Keychain.BIOMETRY_TYPE.TOUCH_ID, BiometryKind.FINGERPRINT],
    [Keychain.BIOMETRY_TYPE.FINGERPRINT, BiometryKind.FINGERPRINT],
    [Keychain.BIOMETRY_TYPE.IRIS, BiometryKind.IRIS],
    [Keychain.BIOMETRY_TYPE.OPTIC_ID, BiometryKind.IRIS],
    ['SomethingNew', BiometryKind.OTHER],
  ])('maps biometry type %s to %s', async (type, expected) => {
    mocked.getSupportedBiometryType.mockResolvedValueOnce(type);
    await expect(store.getBiometryKind()).resolves.toBe(expected);
  });

  it('returns null biometry kind when the query fails', async () => {
    mocked.getSupportedBiometryType.mockRejectedValueOnce(new Error('x'));
    await expect(store.getBiometryKind()).resolves.toBeNull();
  });
});
