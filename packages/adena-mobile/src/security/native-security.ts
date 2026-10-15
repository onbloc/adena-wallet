import {NativeEventEmitter, NativeModules, Platform} from 'react-native';

interface AdenaSecurityNativeModule {
  /** Android: toggles FLAG_SECURE. iOS: hides the window while the screen is being recorded. */
  setSecureScreen(enabled: boolean): void;
  /** A directory excluded from iCloud/Google backups, created on first call. */
  getProtectedStorageDirectory(): Promise<string>;
}

const nativeModule: AdenaSecurityNativeModule | undefined =
  NativeModules.AdenaSecurity;

function requireNativeModule(): AdenaSecurityNativeModule {
  if (!nativeModule) {
    throw new Error('AdenaSecurity native module is not linked');
  }
  return nativeModule;
}

// Screens that show a mnemonic or private key each hold one reference; the flag
// is cleared only when the last of them unmounts.
let secureScreenHolders = 0;

export function acquireSecureScreen(): () => void {
  secureScreenHolders += 1;
  if (secureScreenHolders === 1) {
    requireNativeModule().setSecureScreen(true);
  }

  let released = false;
  return () => {
    if (released) {
      return;
    }
    released = true;
    secureScreenHolders -= 1;
    if (secureScreenHolders === 0) {
      requireNativeModule().setSecureScreen(false);
    }
  };
}

export function getProtectedStorageDirectory(): Promise<string> {
  return requireNativeModule().getProtectedStorageDirectory();
}

/** iOS only: fires after the user took a screenshot (it cannot be prevented there). */
export function onScreenshotTaken(listener: () => void): () => void {
  if (Platform.OS !== 'ios' || !nativeModule) {
    return () => undefined;
  }
  const emitter = new NativeEventEmitter(NativeModules.AdenaSecurity);
  const subscription = emitter.addListener('screenshotTaken', listener);
  return () => subscription.remove();
}
