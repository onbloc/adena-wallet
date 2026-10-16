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
  toBech32,
} from 'adena-module';
import sodium from 'libsodium-wrappers-sumo';
import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

import {
  makeCustomNetwork,
  removeNetwork,
} from '../../src/core/custom-network';
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
const PASSWORD = 'Pw-Settings-1234!';
const NEXT_PASSWORD = 'Pw-Settings-5678!';
const friend = toBech32('g', new Uint8Array(20).fill(7));

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

describe('address book', () => {
  it('stores entries sealed with the wallet password', async () => {
    await wallet.base.addressBookService.addAddressBookItem({
      name: 'Friend',
      address: friend,
    });
    const book = await wallet.base.addressBookService.getAddressBook();
    expect(book.map(item => [item.name, item.address])).toEqual([
      ['Friend', friend],
    ]);
  });

  it('keeps the entries readable after a password change', async () => {
    let changed = false;
    await act(async () => {
      changed = await wallet.changePassword(PASSWORD, NEXT_PASSWORD);
    });
    expect(changed).toBe(true);
    const book = await wallet.base.addressBookService.getAddressBook();
    expect(book.map(item => item.address)).toEqual([friend]);
  });
});

describe('custom networks', () => {
  const custom = makeCustomNetwork({
    name: 'My node',
    rpcUrl: 'https://rpc.mine.example',
    chainId: 'mine-1',
    indexerUrl: '',
  });

  it('adds a network, persists it and registers it for signing', async () => {
    await act(async () => {
      await wallet.saveNetworks([...wallet.networks, custom]);
    });
    expect(wallet.networks.some(item => item.id === custom.id)).toBe(true);
    const stored = await wallet.base.chainService.getNetworks();
    expect(stored.some(item => item.id === custom.id)).toBe(true);
    expect(
      wallet.base.chainRegistry.getNetworkProfileByChainId('mine-1'),
    ).toBeDefined();
  });

  it('rebuilds the provider when the current network is edited', async () => {
    await act(async () => {
      await wallet.switchNetwork(custom.id);
    });
    await waitFor(() => wallet.net?.network.id === custom.id);
    const before = wallet.net;
    await act(async () => {
      await wallet.saveNetworks(
        wallet.networks.map(item =>
          item.id === custom.id
            ? {...item, rpcUrl: 'https://rpc2.mine.example'}
            : item,
        ),
      );
    });
    expect(wallet.net).not.toBe(before);
    expect(wallet.net?.network.rpcUrl).toBe('https://rpc2.mine.example');
  });

  it('falls back to another network when the current one is removed', async () => {
    await act(async () => {
      await wallet.saveNetworks(removeNetwork(wallet.networks, custom.id));
    });
    expect(wallet.networks.some(item => item.id === custom.id)).toBe(false);
    expect(wallet.net?.network.id).not.toBe(custom.id);
    expect(await wallet.base.chainService.getCurrentNetworkId()).toBe(
      wallet.net?.network.id,
    );
  });
});
