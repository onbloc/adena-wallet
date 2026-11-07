import sodium from 'libsodium-wrappers-sumo';
import {
  chromeBackgroundMessenger,
  setBackgroundMessenger,
} from '@common/platform/background-messenger';
import {
  clearInMemoryKey,
  decryptPassword,
  encryptPassword,
} from '@common/utils/crypto-utils';
import {CommandMessage} from '@inject/message/command-message';
import {libsodiumCryptoProvider, setCryptoProvider} from 'adena-module';

import {InProcessMessenger} from '../../src/platform/in-process-messenger';
import {nativeCryptoProvider} from '../../src/platform/native-crypto-provider';

beforeAll(async () => {
  await sodium.ready;
  setCryptoProvider(nativeCryptoProvider);
});

afterAll(() => {
  setCryptoProvider(libsodiumCryptoProvider);
  setBackgroundMessenger(chromeBackgroundMessenger);
});

const create = () => {
  const options = {
    resetAutoLock: jest.fn(async () => undefined),
    onClear: jest.fn(async () => undefined),
  };
  const messenger = new InProcessMessenger(options);
  setBackgroundMessenger(messenger);
  return {messenger, options};
};

describe('InProcessMessenger', () => {
  it('serves the extension session-password helpers in-process', async () => {
    create();
    const {encryptedKey, encryptedPassword} = await encryptPassword(
      'wallet-password',
    );

    expect(encryptedPassword).not.toContain('wallet-password');
    await expect(
      decryptPassword(encryptedKey, encryptedPassword),
    ).resolves.toBe('wallet-password');
  });

  it('cannot open the session password after the key is cleared', async () => {
    create();
    const {encryptedKey, encryptedPassword} = await encryptPassword(
      'wallet-password',
    );
    await clearInMemoryKey();

    await expect(
      decryptPassword(encryptedKey, encryptedPassword),
    ).rejects.toThrow();
  });

  it('rejects a tampered session ciphertext', async () => {
    create();
    const {encryptedKey, encryptedPassword} = await encryptPassword(
      'wallet-password',
    );
    const tampered =
      (encryptedPassword[0] === 'A' ? 'B' : 'A') + encryptedPassword.slice(1);

    await expect(decryptPassword(encryptedKey, tampered)).rejects.toThrow();
  });

  it('routes auto-lock and clear commands to the platform', async () => {
    const {messenger, options} = create();

    await messenger.sendCommand(
      CommandMessage.command('updateAutoLockTimer', {minutes: 3}),
    );
    await messenger.sendCommand(CommandMessage.command('clearPopup'));

    expect(options.resetAutoLock).toHaveBeenCalledTimes(1);
    expect(options.onClear).toHaveBeenCalledTimes(1);
  });

  it('delivers broadcasts to listeners', async () => {
    const {messenger} = create();
    const listener = jest.fn();
    const unsubscribe = messenger.onBroadcast(listener);

    await messenger.broadcast({type: 'TRANSACTION_SUCCESS'});
    unsubscribe();
    await messenger.broadcast({type: 'IGNORED'});

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
