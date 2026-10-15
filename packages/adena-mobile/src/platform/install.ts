import {setBackgroundMessenger} from '@common/platform/background-messenger';
import {AdenaStorage} from '@common/storage/storage';
import {AUTO_LOCK_TRIGGERED_MESSAGE} from '@common/utils/auto-lock-timer';
import {setApprovalPresenter} from '@inject/message/approval-presenter';
import type {InjectionMessage} from '@inject/message/message';
import {
  getCryptoProvider,
  setCryptoProvider,
  toBase64UrlNoPadding,
  verifyCryptoProvider,
} from 'adena-module';

import {ApprovalQueue} from './approval-queue';
import {AutoLock} from './auto-lock';
import {InProcessMessenger} from './in-process-messenger';
import {nativeCryptoProvider} from './native-crypto-provider';
import {installRandomValuesPolyfill} from './random-values-polyfill';
import {MemoryStorage, MmkvStorage, openSecureStorage} from './storage';

export interface MobilePlatform {
  approvals: ApprovalQueue;
  messenger: InProcessMessenger;
  autoLock: AutoLock;
  /** False when the storage key could not be kept in secure hardware; the UI warns. */
  hardwareBackedStorage: boolean;
  lock(): Promise<void>;
}

export type PlatformInstallResult =
  | {ok: true; platform: MobilePlatform}
  | {ok: false; reason: 'crypto' | 'storage'; error: Error};

let installation: Promise<PlatformInstallResult> | null = null;

/**
 * Registers the mobile implementations behind the extension's platform seams.
 * Must run before any shared service touches wallet data. If the crypto
 * self-test or storage fails, nothing is registered and the app must not
 * offer wallet creation or unlock. A successful install happens once; later
 * calls get the same platform.
 */
export function installMobilePlatform(
  makeDismissedResponse: (request: InjectionMessage) => unknown,
): Promise<PlatformInstallResult> {
  if (!installation) {
    installation = install(makeDismissedResponse).then(result => {
      if (!result.ok) {
        installation = null;
      }
      return result;
    });
  }
  return installation;
}

const PROBE_KEY = '__adena_install_probe__';

/**
 * AdenaStorage keeps the first storage registered with it. Confirm that the
 * shared code really reads from ours: otherwise something touched storage
 * before the platform was installed, and wallet data could go elsewhere.
 */
async function isRegistered(
  storage: MemoryStorage | MmkvStorage,
  manager: {get(key: string): Promise<string>},
): Promise<boolean> {
  const probe = toBase64UrlNoPadding(getCryptoProvider().randomBytes(16));
  await storage.set(PROBE_KEY, probe);
  try {
    return (await manager.get(PROBE_KEY)) === probe;
  } finally {
    await storage.remove(PROBE_KEY);
  }
}

async function install(
  makeDismissedResponse: (request: InjectionMessage) => unknown,
): Promise<PlatformInstallResult> {
  installRandomValuesPolyfill();

  try {
    await verifyCryptoProvider(nativeCryptoProvider);
  } catch (error) {
    return {ok: false, reason: 'crypto', error: error as Error};
  }
  setCryptoProvider(nativeCryptoProvider);

  let storage;
  try {
    storage = await openSecureStorage();
  } catch (error) {
    return {ok: false, reason: 'storage', error: error as Error};
  }
  const session = new MemoryStorage();
  const local = AdenaStorage.local(storage.local);
  const sessionManager = AdenaStorage.session(session);
  const cacheManager = AdenaStorage.cache(storage.cache);
  const registered =
    (await isRegistered(storage.local, local)) &&
    (await isRegistered(session, sessionManager)) &&
    (await isRegistered(storage.cache, cacheManager));
  if (!registered) {
    return {
      ok: false,
      reason: 'storage',
      error: new Error(
        'Shared storage was initialized before the mobile platform',
      ),
    };
  }

  const approvals = new ApprovalQueue(makeDismissedResponse);

  // `lock` and `messenger` refer to each other; `lock` is only called later.
  let messenger: InProcessMessenger;
  const isUnlocked = async (): Promise<boolean> =>
    (await session.get('ENCRYPTED_PASSWORD')) !== '';

  const autoLock = new AutoLock({
    readMinutes: async () =>
      Number(await local.get('AUTO_LOCK_TIMEOUT_MINUTES')),
    isUnlocked,
    lock: async () => lock(),
  });

  const lock = async (): Promise<void> => {
    messenger.clearSessionKey();
    await session.clear();
    await approvals.dismissAll();
    await messenger.broadcast({type: AUTO_LOCK_TRIGGERED_MESSAGE});
  };

  messenger = new InProcessMessenger({
    resetAutoLock: () => autoLock.reset(),
    onClear: async () => {
      await session.clear();
      await approvals.dismissAll();
    },
  });

  setBackgroundMessenger(messenger);
  setApprovalPresenter(approvals);
  autoLock.start();

  return {
    ok: true,
    platform: {
      approvals,
      messenger,
      autoLock,
      hardwareBackedStorage: storage.hardwareBacked,
      lock,
    },
  };
}
