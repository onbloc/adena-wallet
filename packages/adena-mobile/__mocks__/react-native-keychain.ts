// In-memory stand-in for the Keychain/Keystore binding.
export enum ACCESSIBLE {
  WHEN_UNLOCKED_THIS_DEVICE_ONLY = 'AccessibleWhenUnlockedThisDeviceOnly',
  WHEN_PASSCODE_SET_THIS_DEVICE_ONLY = 'AccessibleWhenPasscodeSetThisDeviceOnly',
}
export enum ACCESS_CONTROL {
  BIOMETRY_CURRENT_SET = 'BiometryCurrentSet',
}
export enum SECURITY_LEVEL {
  SECURE_SOFTWARE = 'SECURE_SOFTWARE',
  SECURE_HARDWARE = 'SECURE_HARDWARE',
  ANY = 'ANY',
}
export enum STORAGE_TYPE {
  AES_GCM_NO_AUTH = 'KeystoreAESGCM_NoAuth',
  AES_GCM = 'KeystoreAESGCM',
}

/**
 * react-native-keychain 10 on iOS treats a present `cloudSync` option as
 * true, even `false`, and stores a synchronizable item that a query without
 * the option does not find. Items are keyed the same way here.
 */
const itemKey = (options: any) =>
  `${options.service}|sync=${'cloudSync' in options}`;

const items = new Map<
  string,
  {username: string; password: string; options: any}
>();
let hardwareAvailable = true;

export const __reset = (): void => {
  items.clear();
  hardwareAvailable = true;
};
export const __setHardwareAvailable = (available: boolean): void => {
  hardwareAvailable = available;
};
export const __items = items;

export async function setGenericPassword(
  username: string,
  password: string,
  options: any = {},
) {
  if (
    options.securityLevel === SECURITY_LEVEL.SECURE_HARDWARE &&
    !hardwareAvailable
  ) {
    throw new Error('Secure hardware is not available');
  }
  items.set(itemKey(options), {username, password, options});
  return {service: options.service, storage: options.storage};
}

export async function getGenericPassword(options: any = {}) {
  const item = items.get(itemKey(options));
  return item
    ? {
        service: options.service,
        username: item.username,
        password: item.password,
      }
    : false;
}

export async function hasGenericPassword(options: any = {}) {
  return items.has(itemKey(options));
}

export async function resetGenericPassword(options: any = {}) {
  return items.delete(itemKey(options));
}

export async function getSecurityLevel() {
  return hardwareAvailable
    ? SECURITY_LEVEL.SECURE_HARDWARE
    : SECURITY_LEVEL.SECURE_SOFTWARE;
}

export async function getSupportedBiometryType() {
  return 'FaceID';
}
