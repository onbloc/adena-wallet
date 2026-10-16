import {
  chromeBackgroundMessenger,
  setBackgroundMessenger,
} from '@common/platform/background-messenger';
import {setSessionPasswordReader} from '@common/platform/session-password-reader';
import {getSiteName} from '@common/utils/url-parameter-utils';
import {
  chromeApprovalPresenter,
  setApprovalPresenter,
} from '@inject/message/approval-presenter';
import {RoutePath} from '@types';
import {
  AdenaWallet,
  libsodiumCryptoProvider,
  setCryptoProvider,
} from 'adena-module';
import sodium from 'libsodium-wrappers-sumo';
import React from 'react';
import ReactTestRenderer, {act} from 'react-test-renderer';

import {routeToWallet} from '../../src/browser/dapp-router';
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

let platform: MobilePlatform;

const aminoDoc = {
  chain_id: 'atomone-1',
  account_number: '0',
  sequence: '0',
  fee: {amount: [], gas: '200000'},
  msgs: [],
  memo: '',
};
const nativeTextDecoder = globalThis.TextDecoder;

const waitFor = async (check: () => boolean): Promise<void> => {
  for (let i = 0; i < 300 && !check(); i++) {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });
  }
  expect(check()).toBe(true);
};

/** Sends a page request through the shared MessageHandler, as the browser does. */
const send = (type: string, data: unknown) =>
  new Promise<any>(resolve => {
    routeToWallet(
      {
        type,
        key: `${type}-key`,
        status: 'request',
        protocol: 'https:',
        hostname: 'dapp.example',
        data,
      } as any,
      'https://dapp.example/',
      'https://dapp.example',
      resolve,
    );
    // Requests that need a decision wait in the approval queue instead.
    platform.approvals.subscribe(current => {
      if (current) {
        resolve({queued: current.path});
      }
    });
  });

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
    await wallet.createWallet(
      AdenaWallet.generateMnemonic(24),
      'Pw-Test-1234!',
    );
  });
  await waitFor(() => wallet.status === 'unlocked' && !!wallet.address);
});

afterAll(() => {
  globalThis.TextDecoder = nativeTextDecoder;
  platform.autoLock.stop();
  setCryptoProvider(libsodiumCryptoProvider);
  setBackgroundMessenger(chromeBackgroundMessenger);
  setApprovalPresenter(chromeApprovalPresenter);
  setSessionPasswordReader(null);
});

describe('Cosmos requests on the mobile platform', () => {
  it('refuses to sign for a site that is not connected yet', async () => {
    const result = await send('SIGN_COSMOS_AMINO', {
      chainId: 'atomone-1',
      signer: 'atone1xyz',
      signDoc: aminoDoc,
    });
    expect(result.status).toBe('failure');
    expect(result.message).toBe('NOT_CONNECTED');
  });

  it('asks for approval to connect an AtomOne chain', async () => {
    const result = await send('ENABLE_COSMOS', {chainIds: 'atomone-1'});
    expect(result).toEqual({queued: RoutePath.ApproveEstablishCosmos});
    // What CosmosConnectApproval does on Connect.
    const accountId = wallet.account!.id;
    const site = getSiteName('https:', 'dapp.example');
    await wallet.base.establishAtomOneService.establishBy(
      accountId,
      'atomone-1',
      {
        hostname: site,
        accountId,
        appName: site,
        favicon: null,
      },
    );
    await act(async () => {
      await platform.approvals.dismissAll();
    });
  });

  it('returns the AtomOne key of the unlocked account once connected', async () => {
    // This path decrypts the session password inside the shared handler,
    // which only works through the mobile SessionPasswordReader.
    const result = await send('GET_COSMOS_KEY', {chainId: 'atomone-1'});
    expect(result.status).toBe('success');
    expect(result.data.bech32Address).toMatch(/^atone1/);
    expect(result.data.algo).toBe('secp256k1');
  });

  it('queues a sign request from a connected site for approval', async () => {
    const result = await send('SIGN_COSMOS_AMINO', {
      chainId: 'atomone-1',
      signer: 'atone1xyz',
      signDoc: aminoDoc,
    });
    expect(result).toEqual({queued: RoutePath.ApproveSignCosmos});
    await act(async () => {
      await platform.approvals.dismissAll();
    });
  });

  it('answers GET_ACCOUNT for a connected Gno site', async () => {
    // The same session-password path, on the Gno side.
    const accountId = wallet.account!.id;
    const site = getSiteName('https:', 'dapp.example');
    await wallet.base.establishService.establishBy(
      accountId,
      wallet.net!.network.chainId,
      {hostname: site, accountId, appName: site, favicon: null},
    );
    const result = await send('GET_ACCOUNT', {});
    expect(result.status).toBe('success');
    expect(result.data.address).toBe(wallet.address);
  });

  it('refuses chains outside the AtomOne group without asking', async () => {
    const result = await send('ENABLE_COSMOS', {chainIds: 'cosmoshub-4'});
    expect(result.status).toBe('failure');
    expect(result.message).toBe('UNSUPPORTED_TYPE');
  });
});
