import {
  chromeBackgroundMessenger,
  setBackgroundMessenger,
} from '@common/platform/background-messenger';
import {
  getSessionPasswordReader,
  SessionPasswordReader,
  setSessionPasswordReader,
} from '@common/platform/session-password-reader';
import {MemoryProvider} from '@common/provider/memory/memory-provider';
import {
  chromeApprovalPresenter,
  setApprovalPresenter,
} from '@inject/message/approval-presenter';
import {InjectCore} from '@inject/message/methods/core';
import {libsodiumCryptoProvider, setCryptoProvider} from 'adena-module';
import sodium from 'libsodium-wrappers-sumo';

import {makeDismissedResponse} from '../../src/platform/dismissed-response';
import {installMobilePlatform, MobilePlatform} from '../../src/platform/install';

let platform: MobilePlatform;
let mobileReader: SessionPasswordReader | null = null;

beforeAll(async () => {
  await sodium.ready;
  const result = await installMobilePlatform(makeDismissedResponse);
  if (!result.ok) {
    throw result.error;
  }
  platform = result.platform;
  mobileReader = getSessionPasswordReader();
});

afterEach(() => {
  setSessionPasswordReader(mobileReader);
  jest.restoreAllMocks();
});

afterAll(() => {
  platform.autoLock.stop();
  setCryptoProvider(libsodiumCryptoProvider);
  setBackgroundMessenger(chromeBackgroundMessenger);
  setApprovalPresenter(chromeApprovalPresenter);
  setSessionPasswordReader(null);
});

// React Native has no crypto.subtle; Node (Jest) does, so take it away.
const withoutSubtle = () =>
  jest
    .spyOn(globalThis.crypto, 'subtle', 'get')
    .mockReturnValue(undefined as unknown as SubtleCrypto);

describe('InjectCore on mobile', () => {
  it('logs the missing Web Crypto without the session reader (the old path)', async () => {
    withoutSubtle();
    setSessionPasswordReader(null);
    const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
    const core = new InjectCore(new MemoryProvider());
    expect(await core.getInMemoryKey()).toBeNull();
    expect(errors).toHaveBeenCalled();
  });

  it('asks for no Web Crypto key once the app registers its reader', async () => {
    withoutSubtle();
    expect(getSessionPasswordReader()).not.toBeNull();
    const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
    const core = new InjectCore(new MemoryProvider());
    expect(await core.getInMemoryKey()).toBeNull();
    expect(errors).not.toHaveBeenCalled();
  });
});
