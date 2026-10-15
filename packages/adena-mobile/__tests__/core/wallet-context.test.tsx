import {
  chromeBackgroundMessenger,
  setBackgroundMessenger,
} from '@common/platform/background-messenger';
import {
  chromeApprovalPresenter,
  setApprovalPresenter,
} from '@inject/message/approval-presenter';
import {
  AdenaWallet,
  libsodiumCryptoProvider,
  setCryptoProvider,
} from 'adena-module';
import sodium from 'libsodium-wrappers-sumo';
import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

import {useWallet, WalletProvider} from '../../src/core/wallet-context';
import {makeDismissedResponse} from '../../src/platform/dismissed-response';
import {
  installMobilePlatform,
  MobilePlatform,
} from '../../src/platform/install';

jest.setTimeout(60_000);

let wallet: ReturnType<typeof useWallet>;
function Probe() {
  wallet = useWallet();
  return null;
}

const waitFor = async (check: () => boolean): Promise<void> => {
  for (let i = 0; i < 200 && !check(); i++) {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });
  }
  expect(check()).toBe(true);
};

let platform: MobilePlatform;

beforeAll(async () => {
  await sodium.ready;
  const result = await installMobilePlatform(makeDismissedResponse);
  if (!result.ok) {
    throw result.error;
  }
  platform = result.platform;
  await act(async () => {
    ReactTestRenderer.create(
      <WalletProvider platform={platform}>
        <Probe />
      </WalletProvider>,
    );
  });
});

afterAll(() => {
  platform.autoLock.stop();
  setCryptoProvider(libsodiumCryptoProvider);
  setBackgroundMessenger(chromeBackgroundMessenger);
  setApprovalPresenter(chromeApprovalPresenter);
});

const PASSWORD = 'Correct-Horse-Battery-9!';

describe('wallet lifecycle on the mobile platform', () => {
  it('starts without a wallet and with the bundled networks', async () => {
    await waitFor(() => wallet.status === 'no-wallet');
    expect(wallet.networks.length).toBeGreaterThan(0);
    expect(wallet.net?.network.addressPrefix).toBe('g');
  });

  it('creates a wallet, unlocks it and derives a g1 address', async () => {
    await act(async () => {
      await wallet.createWallet(AdenaWallet.generateMnemonic(24), PASSWORD);
    });
    await waitFor(() => wallet.status === 'unlocked' && !!wallet.address);
    expect(wallet.address).toMatch(/^g1[02-9ac-hj-np-z]{38}$/);
  });

  it('locks, refuses a wrong password, then unlocks with the right one', async () => {
    const address = wallet.address;
    await act(async () => {
      await wallet.lock();
    });
    expect(wallet.status).toBe('locked');
    expect(wallet.wallet).toBeNull();

    let unlocked = true;
    await act(async () => {
      unlocked = await wallet.unlock('wrong-password');
    });
    expect(unlocked).toBe(false);
    expect(wallet.status).toBe('locked');

    await act(async () => {
      unlocked = await wallet.unlock(PASSWORD);
    });
    expect(unlocked).toBe(true);
    await waitFor(() => wallet.address === address);
  });

  it('drops the wallet from memory when the platform auto-locks', async () => {
    await act(async () => {
      await platform.lock();
    });
    await waitFor(() => wallet.status === 'locked');
    expect(wallet.wallet).toBeNull();
    expect(wallet.address).toBeNull();
  });

  it('wipes everything on reset', async () => {
    await act(async () => {
      await wallet.resetWallet();
    });
    expect(wallet.status).toBe('no-wallet');
    expect(await wallet.base.walletService.existsWallet()).toBe(false);
  });
});
