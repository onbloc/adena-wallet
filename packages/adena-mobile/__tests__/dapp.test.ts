import { fromBase64 } from '@cosmjs/encoding';
import { Tx } from '@gnolang/tm2-js-client';

import { isAppError } from '../src/core/errors';
import { decodeBase64Url } from '../src/deeplink/base64url';
import { buildDappRequestUrl, DappRequestPayload, getCallbackOrigin, parseDappRequestUrl } from '../src/deeplink/dapp-protocol';
import { DappTransactionRequest } from '../src/domain/dapp';
import { createTestContainer, TEST_MNEMONIC, TEST_PASSWORD } from './helpers/test-container';

const basePayload = (overrides: Partial<DappRequestPayload> = {}): DappRequestPayload => ({
  version: 1,
  id: 'req-1',
  method: 'connect',
  callback: 'https://dapp.example.com/adena/callback?session=abc',
  dapp: { name: 'Example' },
  ...overrides,
});

const readResponse = (callbackUrl: string) => {
  const encoded = decodeURIComponent(new URL(callbackUrl).searchParams.get('response') ?? '');

  return JSON.parse(decodeBase64Url(encoded));
};

const expectAppError = (run: () => unknown, code: Parameters<typeof isAppError>[1]): void => {
  try {
    run();
  }
  catch (error) {
    expect(isAppError(error, code)).toBe(true);
    return;
  }

  throw new Error('expected an error');
};

describe('dapp protocol', () => {
  it('parses a connect request and derives the callback origin', () => {
    const request = parseDappRequestUrl(buildDappRequestUrl(basePayload()), 1000);

    expect(request).toMatchObject({ method: 'connect', requestId: 'req-1', callbackOrigin: 'https://dapp.example.com' });
  });

  it.each([
    'http://dapp.example.com/cb',
    'javascript:alert(1)',
    'adena://request',
    'data:text/html,x',
    'intent://scan/#Intent;scheme=zxing;package=com.evil;end',
    'content://com.android.contacts/data',
    'not a url',
  ])('rejects the unsafe callback %s', (callback) => {
    expectAppError(() => parseDappRequestUrl(buildDappRequestUrl(basePayload({ callback }))), 'INVALID_REQUEST');
  });

  it('accepts app-scheme callbacks', () => {
    expect(getCallbackOrigin('exampleapp://adena-callback')).toBe('exampleapp:');
  });

  it('rejects expired requests', () => {
    expectAppError(() => parseDappRequestUrl(buildDappRequestUrl(basePayload({ expiresAt: 10 })), 20), 'REQUEST_EXPIRED');
  });

  it('requires chainId and messages for transaction requests', () => {
    expectAppError(
      () => parseDappRequestUrl(buildDappRequestUrl(basePayload({ method: 'sign-and-broadcast', expiresAt: Date.now() + 600_000, params: { messages: [] } }))),
      'INVALID_REQUEST',
    );
  });
});

describe('DappService', () => {
  const ORIGIN = 'https://dapp.example.com';
  const setup = async ({ connected = true } = {}) => {
    const env = createTestContainer();
    const account = await env.container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });
    const network = env.container.networkService.getCurrentNetwork();

    if (connected) {
      env.container.connectedAppService.touch(ORIGIN, { name: 'Example' }, account.id, network.id);
    }

    return { ...env, account, network, address: env.container.accountService.getAddress(account, network) };
  };

  it('answers NOT_CONNECTED to transaction requests from a site that never connected', async () => {
    const { container, address } = await setup({ connected: false });
    const request = container.dappService.parseRequestUrl(buildDappRequestUrl(basePayload({
      method: 'sign-and-broadcast',
      expiresAt: Date.now() + 600_000,
      chainId: 'gnoland-1',
      params: { messages: [{ type: '/vm.m_call', value: { caller: address, pkg_path: 'gno.land/r/demo/counter', func: 'Increment', args: [] } }] },
    })));
    let error: unknown;

    try {
      container.dappService.resolveContext(request);
    }
    catch (caught) {
      error = caught;
    }

    expect(isAppError(error, 'NOT_CONNECTED')).toBe(true);
    expect(readResponse(container.dappService.fail(request, error))).toMatchObject({ status: 'failure', error: { code: 'NOT_CONNECTED' } });

    // A connect from the same origin unlocks transactions for that account on any network.
    const connect = container.dappService.parseRequestUrl(buildDappRequestUrl(basePayload({ id: 'connect-1' })));

    container.dappService.approveConnect(connect, container.dappService.resolveContext(connect));
    expect(() => container.dappService.resolveContext(request)).not.toThrow();
  });

  it('answers a connect request with the account address and records the app', async () => {
    const { container, address } = await setup();
    const request = container.dappService.parseRequestUrl(buildDappRequestUrl(basePayload()));
    const callback = container.dappService.approveConnect(request, container.dappService.resolveContext(request));

    expect(callback.startsWith('https://dapp.example.com/adena/callback?session=abc&response=')).toBe(true);
    expect(readResponse(callback)).toMatchObject({ requestId: 'req-1', status: 'success', data: { address, chainId: 'gnoland-1' } });
    expect(container.connectedAppService.getConnectedApps()).toHaveLength(1);
  });

  it('signs and broadcasts a contract call after review', async () => {
    const { container, address, gno } = await setup();
    const request = container.dappService.parseRequestUrl(buildDappRequestUrl(basePayload({
      method: 'sign-and-broadcast',
      expiresAt: Date.now() + 600_000,
      chainId: 'gnoland-1',
      params: { messages: [{ type: '/vm.m_call', value: { caller: address, pkg_path: 'gno.land/r/demo/counter', func: 'Increment', args: [] } }] },
    }))) as DappTransactionRequest;
    const context = container.dappService.resolveContext(request);
    const prepared = await container.dappService.prepareTransaction(request, context);

    expect(prepared.summaries[0]).toMatchObject({ title: 'Call' });
    const callback = await container.dappService.approveTransaction(request, context, prepared.draft);

    expect(readResponse(callback)).toMatchObject({ status: 'success', data: { hash: 'HASH', height: '42' } });
    expect(gno.state.broadcasts).toHaveLength(1);
  });

  it('signs every message of a multi-message request into one transaction', async () => {
    const { container, address, gno } = await setup();
    const recipient = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';
    const request = container.dappService.parseRequestUrl(buildDappRequestUrl(basePayload({
      method: 'sign-and-broadcast',
      expiresAt: Date.now() + 600_000,
      chainId: 'gnoland-1',
      params: {
        messages: [
          { type: '/bank.MsgSend', value: { from_address: address, to_address: recipient, amount: '1ugnot' } },
          { type: '/vm.m_call', value: { caller: address, pkg_path: 'gno.land/r/gnoswap/gns', func: 'Transfer', args: [recipient, '1'] } },
          { type: '/vm.m_call', value: { caller: address, pkg_path: 'gno.land/r/gnoswap/gns', func: 'Transfer', args: [recipient, '2'] } },
        ],
      },
    }))) as DappTransactionRequest;
    const context = container.dappService.resolveContext(request);
    const prepared = await container.dappService.prepareTransaction(request, context);

    expect(prepared.summaries.map(summary => summary.title)).toEqual(['Transfer', 'Call', 'Call']);
    await container.dappService.approveTransaction(request, context, prepared.draft);
    const broadcast = Tx.decode(fromBase64(gno.state.broadcasts[0]));

    expect(broadcast.messages.map(message => message.type_url)).toEqual(['/bank.MsgSend', '/vm.m_call', '/vm.m_call']);
    expect(broadcast.signatures).toHaveLength(1);
  });

  it('refuses a multi-message request when any message has another signer', async () => {
    const { container, address } = await setup();
    const other = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';
    const request = container.dappService.parseRequestUrl(buildDappRequestUrl(basePayload({
      method: 'sign-and-broadcast',
      expiresAt: Date.now() + 600_000,
      chainId: 'gnoland-1',
      params: {
        messages: [
          { type: '/vm.m_call', value: { caller: address, pkg_path: 'gno.land/r/demo/counter', func: 'Increment', args: [] } },
          { type: '/vm.m_call', value: { caller: other, pkg_path: 'gno.land/r/demo/counter', func: 'Increment', args: [] } },
        ],
      },
    }))) as DappTransactionRequest;
    const context = container.dappService.resolveContext(request);
    const error = await container.dappService.prepareTransaction(request, context).catch((e: unknown) => e);

    expect(isAppError(error, 'INVALID_REQUEST')).toBe(true);
  });

  it('flags requests for another configured network', async () => {
    const { container } = await setup();
    const request = container.dappService.parseRequestUrl(buildDappRequestUrl(basePayload({ chainId: 'onyx-1' })));

    expect(container.dappService.resolveContext(request)).toMatchObject({ requiresNetworkSwitch: true, network: { id: 'onyx-1' } });
  });

  it('rejects requests for unknown chains', async () => {
    const { container } = await setup();
    const request = container.dappService.parseRequestUrl(buildDappRequestUrl(basePayload({ chainId: 'unknown-9' })));

    expectAppError(() => container.dappService.resolveContext(request), 'NETWORK_MISMATCH');
  });

  it('returns USER_REJECTED to the dApp on rejection', async () => {
    const { container } = await setup();
    const request = container.dappService.parseRequestUrl(buildDappRequestUrl(basePayload()));

    expect(readResponse(container.dappService.reject(request))).toMatchObject({ status: 'failure', error: { code: 'USER_REJECTED' } });
  });
});
