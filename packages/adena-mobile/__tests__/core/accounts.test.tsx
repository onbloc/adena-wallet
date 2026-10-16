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
  isHDWalletKeyring,
  libsodiumCryptoProvider,
  setCryptoProvider,
} from 'adena-module';
import sodium from 'libsodium-wrappers-sumo';
import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

import {
  withPrivateKeyAccount,
  withSeedAccounts,
} from '../../src/core/account-import';
import {useWallet, WalletProvider} from '../../src/core/wallet-context';
import {makeDismissedResponse} from '../../src/platform/dismissed-response';
import {
  installMobilePlatform,
  MobilePlatform,
} from '../../src/platform/install';
import {installTextDecoderPolyfill} from '../../src/platform/text-decoder-polyfill';

jest.setTimeout(60_000);

let wallet: ReturnType<typeof useWallet>;
function Probe() {
  wallet = useWallet();
  return null;
}

const waitFor = async (check: () => boolean): Promise<void> => {
  for (let i = 0; i < 300 && !check(); i++) {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });
  }
  expect(check()).toBe(true);
};

let platform: MobilePlatform;
const nativeTextDecoder = globalThis.TextDecoder;
const PASSWORD = 'Pw-Accounts-1234!';

beforeAll(async () => {
  delete (globalThis as {TextDecoder?: unknown}).TextDecoder;
  installTextDecoderPolyfill();
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
  await waitFor(() => wallet.status === 'no-wallet');
  await act(async () => {
    await wallet.createWallet(AdenaWallet.generateMnemonic(24), PASSWORD);
  });
  await waitFor(() => wallet.status === 'unlocked' && !!wallet.address);
});

afterAll(() => {
  globalThis.TextDecoder = nativeTextDecoder;
  platform.autoLock.stop();
  setCryptoProvider(libsodiumCryptoProvider);
  setBackgroundMessenger(chromeBackgroundMessenger);
  setApprovalPresenter(chromeApprovalPresenter);
});

describe('accounts', () => {
  it('adds the next account of the seed phrase and switches to it', async () => {
    const first = wallet.account!;
    const firstAddress = wallet.address;
    let added = false;
    await act(async () => {
      added = await wallet.addAccount();
    });
    expect(added).toBe(true);
    await waitFor(() => wallet.account?.id !== first.id);
    expect(wallet.wallet!.accounts).toHaveLength(2);
    expect(wallet.account!.name).toBe('Account 2');
    expect(wallet.address).not.toBe(firstAddress);
  });

  it('keeps the added account after locking and unlocking', async () => {
    const id = wallet.account!.id;
    await act(async () => {
      await wallet.lock();
    });
    await act(async () => {
      expect(await wallet.unlock(PASSWORD)).toBe(true);
    });
    await waitFor(() => wallet.account?.id === id);
    expect(wallet.wallet!.accounts).toHaveLength(2);
  });

  it('renames an account and stores the name', async () => {
    const id = wallet.account!.id;
    await act(async () => {
      await wallet.renameAccount(id, '  Savings  ');
    });
    expect(wallet.accountNames[id]).toBe('Savings');
    expect(await wallet.base.accountRepository.getAccountNames()).toMatchObject(
      {[id]: 'Savings'},
    );
  });

  it('switches back to the first account', async () => {
    const first = wallet.wallet!.accounts[0];
    await act(async () => {
      await wallet.switchAccount(first.id);
    });
    await waitFor(() => wallet.account?.id === first.id);
  });

  it('removes an account but never the last one', async () => {
    const second = wallet.wallet!.accounts[1];
    let removed = false;
    await act(async () => {
      removed = await wallet.removeAccount(second.id);
    });
    expect(removed).toBe(true);
    expect(wallet.wallet!.accounts).toHaveLength(1);
    expect(wallet.accountNames[second.id]).toBeUndefined();

    const last = wallet.wallet!.accounts[0];
    await act(async () => {
      removed = await wallet.removeAccount(last.id);
    });
    expect(removed).toBe(false);
    expect(wallet.wallet!.accounts).toHaveLength(1);
  });

  // Public BIP39 test vector and a dummy key: never real secrets.
  const OTHER_PHRASE =
    'legal winner thank year wave sausage worth useful legal winner thank yellow';
  const DUMMY_KEY = '22'.repeat(32);

  it('adds accounts of another seed phrase and keeps them after unlock', async () => {
    const before = wallet.wallet!.accounts.length;
    const result = await withSeedAccounts(
      wallet.wallet!,
      OTHER_PHRASE,
      [0, 1],
      'g',
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    await act(async () => {
      await wallet.saveAddedAccounts(result.next, result.added[1].id);
    });
    await waitFor(() => wallet.account?.id === result.added[1].id);
    expect(wallet.wallet!.accounts).toHaveLength(before + 2);

    await act(async () => {
      await wallet.lock();
    });
    await act(async () => {
      expect(await wallet.unlock(PASSWORD)).toBe(true);
    });
    await waitFor(() => wallet.status === 'unlocked');
    expect(wallet.wallet!.accounts).toHaveLength(before + 2);
    expect(wallet.wallet!.keyrings.filter(isHDWalletKeyring)).toHaveLength(2);
  });

  it('derives the next account of the chosen seed phrase', async () => {
    const [, other] = wallet.wallet!.keyrings.filter(isHDWalletKeyring);
    const before = wallet.wallet!.accounts.filter(
      item => item.keyringId === other.id,
    ).length;
    await act(async () => {
      expect(await wallet.addAccount(other.id)).toBe(true);
    });
    await waitFor(
      () =>
        wallet.wallet!.accounts.filter(item => item.keyringId === other.id)
          .length === before + 1,
    );
    expect(wallet.account!.keyringId).toBe(other.id);
  });

  it('adds a private key account once', async () => {
    const result = await withPrivateKeyAccount(wallet.wallet!, DUMMY_KEY, 'g');
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    await act(async () => {
      await wallet.saveAddedAccounts(result.next, result.added[0].id);
    });
    await waitFor(() => wallet.account?.id === result.added[0].id);
    expect(
      await withPrivateKeyAccount(wallet.wallet!, DUMMY_KEY, 'g'),
    ).toEqual({ok: false, reason: 'exists'});
  });
});
