import sodium from 'libsodium-wrappers-sumo';
import {
  chromeBackgroundMessenger,
  getBackgroundMessenger,
  setBackgroundMessenger,
} from '@common/platform/background-messenger';
import {
  getSessionPasswordReader,
  setSessionPasswordReader,
} from '@common/platform/session-password-reader';
import {AdenaStorage} from '@common/storage/storage';
import {
  chromeApprovalPresenter,
  getApprovalPresenter,
  setApprovalPresenter,
} from '@inject/message/approval-presenter';
import {
  getCryptoProvider,
  libsodiumCryptoProvider,
  setCryptoProvider,
} from 'adena-module';

import {makeDismissedResponse} from '../../src/platform/dismissed-response';
import {installMobilePlatform} from '../../src/platform/install';
import {nativeCryptoProvider} from '../../src/platform/native-crypto-provider';

beforeAll(async () => {
  await sodium.ready;
});

afterAll(() => {
  setCryptoProvider(libsodiumCryptoProvider);
  setBackgroundMessenger(chromeBackgroundMessenger);
  setApprovalPresenter(chromeApprovalPresenter);
  setSessionPasswordReader(null);
});

describe('installMobilePlatform', () => {
  it('registers the mobile implementations behind every extension seam', async () => {
    const result = await installMobilePlatform(makeDismissedResponse);
    if (!result.ok) {
      throw result.error;
    }

    expect(getCryptoProvider()).toBe(nativeCryptoProvider);
    expect(getBackgroundMessenger()).toBe(result.platform.messenger);
    expect(getApprovalPresenter()).toBe(result.platform.approvals);
    expect(getSessionPasswordReader()).toBe(
      result.platform.messenger.readSessionPassword,
    );
    result.platform.autoLock.stop();
  });

  it('clears the session and fails pending approvals when it locks', async () => {
    const result = await installMobilePlatform(makeDismissedResponse);
    if (!result.ok) {
      throw result.error;
    }
    const {platform} = result;
    const session = AdenaStorage.session();
    await session.set('ENCRYPTED_PASSWORD', 'sealed');
    const sendResponse = jest.fn();
    await platform.approvals.present(
      '/approve',
      {key: 'k'} as any,
      {} as any,
      sendResponse,
    );
    const broadcasts = jest.fn();
    platform.messenger.onBroadcast(broadcasts);

    await platform.lock();

    expect(await session.get('ENCRYPTED_PASSWORD')).toBe('');
    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({type: 'UNEXPECTED_ERROR'}),
    );
    expect(broadcasts).toHaveBeenCalledWith({type: 'AUTO_LOCK_TRIGGERED'});
    platform.autoLock.stop();
  });

  it('registers nothing when the crypto self-test fails', async () => {
    await jest.isolateModulesAsync(async () => {
      await require('libsodium-wrappers-sumo').ready;
      const mock = require('react-native-libsodium');
      jest
        .spyOn(mock, 'randombytes_buf')
        .mockImplementation((length: any) => new Uint8Array(length));
      const fresh = require('../../src/platform/install');
      const seams = {
        crypto: require('adena-module'),
        messenger: require('@common/platform/background-messenger'),
        presenter: require('@inject/message/approval-presenter'),
      };

      const result = await fresh.installMobilePlatform(makeDismissedResponse);

      expect(result).toMatchObject({ok: false, reason: 'crypto'});
      expect(seams.crypto.getCryptoProvider()).toBe(
        seams.crypto.libsodiumCryptoProvider,
      );
      expect(seams.messenger.getBackgroundMessenger()).toBe(
        seams.messenger.chromeBackgroundMessenger,
      );
      expect(seams.presenter.getApprovalPresenter()).toBe(
        seams.presenter.chromeApprovalPresenter,
      );
    });
  });

  it('refuses to start when shared storage was initialized before the platform', async () => {
    await jest.isolateModulesAsync(async () => {
      await require('libsodium-wrappers-sumo').ready;
      const {AdenaStorage: FreshStorage} = require('@common/storage/storage');
      const {MemoryStorage} = require('../../src/platform/storage');
      FreshStorage.local(new MemoryStorage());
      const fresh = require('../../src/platform/install');

      const result = await fresh.installMobilePlatform(makeDismissedResponse);

      expect(result).toMatchObject({ok: false, reason: 'storage'});
    });
  });

  it('installs once and returns the same platform afterwards', async () => {
    const first = await installMobilePlatform(makeDismissedResponse);
    const second = await installMobilePlatform(makeDismissedResponse);
    expect(second).toBe(first);
  });
});
