import { fromBase64 } from '@cosmjs/encoding';
import { Tx } from '@gnolang/tm2-js-client';

import { AppError, isAppError, TransactionPendingError } from '../../../src/core/errors';
import { decodeBase64Url } from '../../../src/deeplink/base64url';
import { buildDappRequestUrl, DappRequestPayload } from '../../../src/deeplink/dapp-protocol';
import { DappTransactionRequest } from '../../../src/domain/dapp';
import { StorageProcessedDappRequestRepository } from '../../../src/repositories/processed-dapp-request.repository';
import { catchError } from '../../helpers/service-fakes';
import { createTestContainer, TEST_MNEMONIC, TEST_PASSWORD } from '../../helpers/test-container';

const ORIGIN = 'https://dapp.example.com';
const RECIPIENT = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';

const payload = (overrides: Partial<DappRequestPayload> = {}): DappRequestPayload => ({
  version: 1,
  id: 'req-1',
  method: 'connect',
  callback: `${ORIGIN}/cb`,
  dapp: { name: 'Example', icon: `${ORIGIN}/icon.png` },
  ...overrides,
});

const readResponse = (callbackUrl: string) =>
  JSON.parse(decodeBase64Url(decodeURIComponent(new URL(callbackUrl).searchParams.get('response') ?? '')));

const codeOf = async (run: () => unknown) => {
  const error = await catchError(run);

  return isAppError(error) ? error.code : error;
};

const setup = async ({ connected = true } = {}) => {
  const env = createTestContainer();
  const account = await env.container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });
  const network = env.container.networkService.getCurrentNetwork();
  const address = env.container.accountService.getAddress(account, network);
  const service = env.container.dappService;

  if (connected) {
    env.container.connectedAppService.touch(ORIGIN, { name: 'Example' }, account.id, network.id);
  }

  const call = (caller = address) => ({ type: '/vm.m_call', value: { caller, pkg_path: 'gno.land/r/demo/counter', func: 'Increment', args: [] } });
  const txRequest = (overrides: Partial<DappRequestPayload> = {}, params: DappRequestPayload['params'] = { messages: [call()] }) =>
    service.parseRequestUrl(buildDappRequestUrl(payload({ method: 'sign-and-broadcast', chainId: 'gnoland-1', expiresAt: Date.now() + 600_000, params, ...overrides }))) as DappTransactionRequest;

  return { ...env, service, account, network, address, call, txRequest };
};

describe('DappService', () => {
  it('parses request links', async () => {
    const { service } = await setup();

    expect(service.parseRequestUrl(buildDappRequestUrl(payload()))).toMatchObject({ method: 'connect', callbackOrigin: ORIGIN, requestId: 'req-1' });
    expect(await codeOf(() => service.parseRequestUrl('https://evil.example'))).toBe('INVALID_REQUEST');
  });

  describe('resolveContext', () => {
    it('uses the current network when the request names no chain', async () => {
      const { service, account, network, address } = await setup();

      expect(service.resolveContext(service.parseRequestUrl(buildDappRequestUrl(payload())))).toEqual({ network, account, address, requiresNetworkSwitch: false });
    });

    it('flags another configured chain and derives the address there', async () => {
      const { container, service, account } = await setup();
      const context = service.resolveContext(service.parseRequestUrl(buildDappRequestUrl(payload({ chainId: 'onyx-1' }))));

      expect(context).toMatchObject({ requiresNetworkSwitch: true, network: { id: 'onyx-1' } });
      expect(context.address).toBe(container.accountService.getAddress(account, context.network));
    });

    it('rejects unknown chains', async () => {
      const { service } = await setup();

      expect(await codeOf(() => service.resolveContext(service.parseRequestUrl(buildDappRequestUrl(payload({ chainId: 'unknown-9' })))))).toBe('NETWORK_MISMATCH');
    });

    it('requires an account', async () => {
      const { container, service } = await setup();

      container.accountService.clear();
      expect(await codeOf(() => service.resolveContext(service.parseRequestUrl(buildDappRequestUrl(payload()))))).toBe('WALLET_NOT_FOUND');
    });

    it('answers NOT_CONNECTED for transactions from a site that never connected', async () => {
      const { service, txRequest } = await setup({ connected: false });
      const request = txRequest();
      const error = await catchError(() => service.resolveContext(request));

      expect(isAppError(error, 'NOT_CONNECTED')).toBe(true);
      expect(readResponse(service.fail(request, error))).toEqual({ requestId: 'req-1', status: 'failure', error: { code: 'NOT_CONNECTED', message: (error as Error).message } });
      expect((error as Error).message).not.toContain('Account 1');
    });

    it('scopes connections to the account that approved them', async () => {
      const { container, service, txRequest } = await setup();
      const second = await container.accountService.createAccount(container.accountService.getAccounts()[0].keyringId, 'HD_WALLET');

      expect(() => service.resolveContext(txRequest())).not.toThrow();
      container.accountService.selectAccount(second.id);
      expect(await codeOf(() => service.resolveContext(txRequest()))).toBe('NOT_CONNECTED');
    });

    it('accepts transactions on another network once connected anywhere', async () => {
      const { service, txRequest } = await setup();

      expect(service.resolveContext(txRequest({ chainId: 'onyx-1' }))).toMatchObject({ requiresNetworkSwitch: true });
    });
  });

  describe('approveConnect', () => {
    it('records the app for the account and network and returns the account', async () => {
      const { container, service, account, address } = await setup({ connected: false });
      const request = service.parseRequestUrl(buildDappRequestUrl(payload({ chainId: 'onyx-1' })));
      const response = readResponse(service.approveConnect(request, service.resolveContext(request)));

      expect(response).toEqual({ requestId: 'req-1', status: 'success', data: { address, publicKey: account.publicKey, chainId: 'onyx-1' } });
      expect(container.connectedAppService.find(ORIGIN, account.id, 'onyx-1')).toMatchObject({ name: 'Example', icon: `${ORIGIN}/icon.png` });
    });
  });

  describe('prepareTransaction', () => {
    it('estimates the fee when the dApp gave none', async () => {
      const { service, txRequest } = await setup();
      const request = txRequest();
      const prepared = await service.prepareTransaction(request, service.resolveContext(request));

      expect(prepared.draft.fee).toEqual({ gasWanted: '110253', gasFee: '111ugnot' });
      expect(prepared.summaries.map(summary => summary.title)).toEqual(['Call']);
    });

    it('keeps a well-formed fee requested by the dApp', async () => {
      const { service, txRequest, call, container } = await setup();
      const spy = jest.spyOn(container.transactionService, 'withEstimatedFee');
      const request = txRequest({}, { messages: [call()], gasWanted: '500000', gasFee: '600ugnot', memo: 'from dapp' });
      const prepared = await service.prepareTransaction(request, service.resolveContext(request));

      expect(prepared.draft).toMatchObject({ fee: { gasWanted: '500000', gasFee: '600ugnot' }, memo: 'from dapp' });
      // 600ugnot is over 3x the 111ugnot estimate, so the estimate is returned for a warning.
      expect(spy).toHaveBeenCalled();
      expect(prepared.estimatedFee).toMatchObject({ gasFee: '111ugnot' });
    });

    it('does not flag a dApp fee within 3x the estimate', async () => {
      const { service, txRequest, call } = await setup();
      const request = txRequest({}, { messages: [call()], gasWanted: '500000', gasFee: '333ugnot' });
      const prepared = await service.prepareTransaction(request, service.resolveContext(request));

      expect(prepared.draft.fee.gasFee).toBe('333ugnot');
      expect(prepared.estimatedFee).toBeUndefined();
    });

    it('keeps the dApp fee without a warning when the estimate fails', async () => {
      const { service, txRequest, call, container } = await setup();

      jest.spyOn(container.transactionService, 'withEstimatedFee').mockRejectedValue(new Error('rpc down'));
      const request = txRequest({}, { messages: [call()], gasWanted: '500000', gasFee: '600000ugnot' });
      const prepared = await service.prepareTransaction(request, service.resolveContext(request));

      expect(prepared.draft.fee.gasFee).toBe('600000ugnot');
      expect(prepared.estimatedFee).toBeUndefined();
    });

    it.each([
      [{ gasWanted: '500000' }],
      [{ gasFee: '600ugnot' }],
      [{ gasWanted: '500000', gasFee: 'lots' }],
      [{ gasWanted: '500000', gasFee: '600uatom' }],
      [{ gasWanted: 'lots', gasFee: '600ugnot' }],
      [{ gasWanted: '0', gasFee: '600ugnot' }],
    ])('estimates when the requested fee is incomplete or malformed: %p', async (fee) => {
      const { service, txRequest, call } = await setup();
      const request = txRequest({}, { messages: [call()], ...fee });

      expect((await service.prepareTransaction(request, service.resolveContext(request))).draft.fee.gasFee).toBe('111ugnot');
    });

    it('shows the storage deposit cap of a call', async () => {
      const { service, txRequest, call } = await setup();
      const message = call();
      const request = txRequest({}, { messages: [{ ...message, value: { ...message.value, max_deposit: '2000000ugnot' } }] });
      const [summary] = (await service.prepareTransaction(request, service.resolveContext(request))).summaries;

      expect(summary.details).toContainEqual({ label: 'Max deposit', value: '2 GNOT' });
    });

    it('rejects a message with another signer', async () => {
      const { service, txRequest, call } = await setup();
      const request = txRequest({}, { messages: [call(), call(RECIPIENT)] });

      expect(await codeOf(() => service.prepareTransaction(request, service.resolveContext(request)))).toBe('INVALID_REQUEST');
    });

    it('rejects too many messages', async () => {
      const { service, txRequest, call } = await setup();
      const request = txRequest({}, { messages: Array(17).fill(call()) });

      expect(await codeOf(() => service.prepareTransaction(request, service.resolveContext(request)))).toBe('INVALID_REQUEST');
    });
  });

  describe('approveTransaction', () => {
    it('signs and broadcasts, refreshing the connection', async () => {
      const { container, service, txRequest, gno, account, network } = await setup();
      const request = txRequest();
      const context = service.resolveContext(request);
      const { draft } = await service.prepareTransaction(request, context);
      const before = container.connectedAppService.find(ORIGIN, account.id, network.id)?.lastUsedAt ?? 0;
      const response = readResponse(await service.approveTransaction(request, context, draft));

      expect(response).toMatchObject({ status: 'success', data: { hash: 'HASH', height: '42' } });
      expect(gno.state.broadcasts).toHaveLength(1);
      expect(container.connectedAppService.find(ORIGIN, account.id, network.id)?.lastUsedAt).toBeGreaterThanOrEqual(before);
    });

    it('only signs for sign-transaction requests', async () => {
      const { service, txRequest, gno, address } = await setup();
      const request = txRequest({ method: 'sign-transaction' });
      const context = service.resolveContext(request);
      const { draft } = await service.prepareTransaction(request, context);
      const response = readResponse(await service.approveTransaction(request, context, draft));

      expect(response.data.address).toBe(address);
      expect(Tx.decode(fromBase64(response.data.signedTx)).signatures).toHaveLength(1);
      expect(gno.state.broadcasts).toEqual([]);
    });

    it('cannot sign while the wallet is locked', async () => {
      const { container, service, txRequest } = await setup();
      const request = txRequest();
      const context = service.resolveContext(request);
      const { draft } = await service.prepareTransaction(request, context);

      container.walletService.lock();
      expect(await codeOf(() => service.approveTransaction(request, context, draft))).toBe('WALLET_LOCKED');
    });
  });

  describe('approving once', () => {
    it('lets only one of two sheets for the same request sign and broadcast', async () => {
      const { service, txRequest, gno } = await setup();
      const first = txRequest();
      const second = txRequest();
      const context = service.resolveContext(first);
      const { draft } = await service.prepareTransaction(first, context);
      const results = await Promise.allSettled([
        service.approveTransaction(first, context, draft),
        service.approveTransaction(second, context, draft),
      ]);

      expect(results.map(result => result.status)).toEqual(['fulfilled', 'rejected']);
      expect(isAppError((results[1] as PromiseRejectedResult).reason, 'DUPLICATE_REQUEST')).toBe(true);
      expect(gno.state.broadcasts).toHaveLength(1);
      expect(await codeOf(() => service.approveConnect(service.parseRequestUrl(buildDappRequestUrl(payload())), context))).toBe('DUPLICATE_REQUEST');
    });

    it('keeps a definitely failed approval retryable', async () => {
      const { container, service, txRequest, gno } = await setup();
      const request = txRequest();
      const context = service.resolveContext(request);
      const { draft } = await service.prepareTransaction(request, context);

      container.walletService.lock();
      expect(await codeOf(() => service.approveTransaction(request, context, draft))).toBe('WALLET_LOCKED');
      expect(service.isProcessed(request)).toBe(false);
      await container.walletService.unlock(TEST_PASSWORD);
      await service.approveTransaction(request, context, draft);
      expect(gno.state.broadcasts).toHaveLength(1);
    });

    it('blocks a second approval after an unknown broadcast outcome', async () => {
      const { container, service, txRequest } = await setup();
      const request = txRequest();
      const context = service.resolveContext(request);
      const { draft } = await service.prepareTransaction(request, context);
      const broadcast = jest.spyOn(container.transactionService, 'signAndBroadcast').mockRejectedValue(new TransactionPendingError('HASH'));

      expect(await codeOf(() => service.approveTransaction(request, context, draft))).toBe('TRANSACTION_PENDING');
      expect(await codeOf(() => service.approveTransaction(txRequest(), context, draft))).toBe('DUPLICATE_REQUEST');
      expect(broadcast).toHaveBeenCalledTimes(1);
    });
  });

  describe('expiry', () => {
    it('refuses to approve a request that expired during review', async () => {
      let clock = Date.now();
      const env = createTestContainer({ now: () => clock });
      const account = await env.container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });
      const network = env.container.networkService.getCurrentNetwork();
      const service = env.container.dappService;
      const caller = env.container.accountService.getAddress(account, network);
      const expiresAt = Date.now() + 60_000;

      env.container.connectedAppService.touch(ORIGIN, { name: 'Example' }, account.id, network.id);
      const connect = service.parseRequestUrl(buildDappRequestUrl(payload({ expiresAt })));
      const tx = service.parseRequestUrl(buildDappRequestUrl(payload({
        id: 'req-2',
        method: 'sign-and-broadcast',
        chainId: 'gnoland-1',
        expiresAt,
        params: { messages: [{ type: '/vm.m_call', value: { caller, pkg_path: 'gno.land/r/demo/counter', func: 'Increment', args: [] } }] },
      }))) as DappTransactionRequest;
      const context = service.resolveContext(tx);
      const { draft } = await service.prepareTransaction(tx, context);

      clock = expiresAt + 1;
      expect(await codeOf(() => service.approveConnect(connect, context))).toBe('REQUEST_EXPIRED');
      expect(await codeOf(() => service.approveTransaction(tx, context, draft))).toBe('REQUEST_EXPIRED');
      expect(env.gno.state.broadcasts).toEqual([]);
      expect(readResponse(service.fail(tx, await catchError(() => service.approveTransaction(tx, context, draft)))).error.code).toBe('REQUEST_EXPIRED');
    });
  });

  describe('failure responses', () => {
    it('rejects with USER_REJECTED', async () => {
      const { service } = await setup();

      expect(readResponse(service.reject(service.parseRequestUrl(buildDappRequestUrl(payload()))))).toEqual({
        requestId: 'req-1', status: 'failure', error: { code: 'USER_REJECTED', message: 'User rejected the request' },
      });
    });

    it('maps unknown errors to TRANSACTION_FAILED', async () => {
      const { service } = await setup();
      const request = (id: string) => service.parseRequestUrl(buildDappRequestUrl(payload({ id })));

      expect(readResponse(service.fail(request('a'), new AppError('INSUFFICIENT_BALANCE', 'Not enough'))).error).toEqual({ code: 'INSUFFICIENT_BALANCE', message: 'Not enough' });
      expect(readResponse(service.fail(request('b'), new Error('rpc down at http://10.0.0.1'))).error).toEqual({ code: 'UNEXPECTED_ERROR', message: 'The request could not be completed' });
      expect(readResponse(service.fail(request('c'), 'weird')).error).toEqual({ code: 'UNEXPECTED_ERROR', message: 'The request could not be completed' });
      // A repeated answer keeps the first outcome.
      expect(readResponse(service.fail(request('a'), 'weird')).error).toEqual({ code: 'INSUFFICIENT_BALANCE', message: 'Not enough' });
    });

    it('keeps the code and hash of an unknown broadcast outcome', async () => {
      const { service } = await setup();
      const request = service.parseRequestUrl(buildDappRequestUrl(payload()));

      expect(readResponse(service.fail(request, new TransactionPendingError('HASH')))).toMatchObject({
        status: 'failure', error: { code: 'TRANSACTION_PENDING' }, data: { hash: 'HASH' },
      });
    });

    it('answers crashes generically', async () => {
      const { service } = await setup();
      const request = service.parseRequestUrl(buildDappRequestUrl(payload()));

      expect(readResponse(service.failUnexpected(request)).error).toEqual({ code: 'UNEXPECTED_ERROR', message: 'The request could not be completed' });
    });
  });

  describe('processed requests', () => {
    it('remembers answered requests per origin and answers duplicates with an error', async () => {
      const { service } = await setup();
      const request = service.parseRequestUrl(buildDappRequestUrl(payload()));
      const otherOrigin = service.parseRequestUrl(buildDappRequestUrl(payload({ callback: 'exampleapp://cb' })));

      expect(service.isProcessed(request)).toBe(false);
      service.reject(request);
      expect(service.isProcessed(service.parseRequestUrl(buildDappRequestUrl(payload())))).toBe(true);
      expect(service.isProcessed(otherOrigin)).toBe(false);
      expect(readResponse(service.answerDuplicate(request))).toEqual({
        requestId: 'req-1', status: 'failure', error: { code: 'USER_REJECTED', message: 'User rejected the request' },
      });
    });

    it('answers a duplicate of a pending broadcast with its hash', async () => {
      const { container, service, txRequest } = await setup();
      const request = txRequest();
      const context = service.resolveContext(request);
      const { draft } = await service.prepareTransaction(request, context);

      jest.spyOn(container.transactionService, 'signAndBroadcast').mockRejectedValue(new TransactionPendingError('HASH'));
      await catchError(() => service.approveTransaction(request, context, draft));
      // The screen was requeued without answering; the replay must still carry the hash.
      expect(readResponse(service.answerDuplicate(txRequest()))).toEqual({
        requestId: 'req-1', status: 'failure', error: { code: 'TRANSACTION_PENDING', message: 'The transaction was sent but not confirmed yet' }, data: { hash: 'HASH' },
      });
      expect(readResponse(service.fail(request, await catchError(() => service.approveTransaction(txRequest(), context, draft))))).toMatchObject({
        error: { code: 'TRANSACTION_PENDING' }, data: { hash: 'HASH' },
      });
    });

    it('replays a broadcast result whose callback never opened', async () => {
      const { service, txRequest, keyValueStore } = await setup();
      const request = txRequest();
      const context = service.resolveContext(request);
      const { draft } = await service.prepareTransaction(request, context);

      await service.approveTransaction(request, context, draft);
      expect(readResponse(service.answerDuplicate(txRequest()))).toEqual({
        requestId: 'req-1', status: 'success', data: { hash: 'HASH', height: '42', committed: expect.any(Boolean) },
      });
      expect(new StorageProcessedDappRequestRepository(keyValueStore).get(`${ORIGIN}\nreq-1`)).toMatchObject({ state: 'done', tx: { hash: 'HASH' } });
    });

    it('tells a second sheet the request is still being processed, without overwriting it', async () => {
      const { container, service, txRequest } = await setup();
      const request = txRequest();
      const context = service.resolveContext(request);
      const { draft } = await service.prepareTransaction(request, context);
      let settle: (result: { hash: string; height: string; committed: boolean }) => void = () => undefined;

      jest.spyOn(container.transactionService, 'signAndBroadcast').mockImplementation(() => new Promise((resolve) => {
        settle = resolve;
      }));
      const first = service.approveTransaction(request, context, draft);
      const second = txRequest();

      expect(readResponse(service.answerDuplicate(second))).toEqual({
        requestId: 'req-1', status: 'failure', error: { code: 'REQUEST_IN_PROGRESS', message: 'This request is still being processed. Wait for its result.' },
      });
      expect(readResponse(service.reject(second)).error.code).toBe('REQUEST_IN_PROGRESS');
      expect(readResponse(service.fail(second, await catchError(() => service.approveTransaction(second, context, draft)))).error.code).toBe('REQUEST_IN_PROGRESS');
      settle({ hash: 'HASH', height: '7', committed: true });
      expect(readResponse(await first)).toMatchObject({ status: 'success', data: { hash: 'HASH' } });
      expect(readResponse(service.answerDuplicate(second))).toMatchObject({ status: 'success', data: { hash: 'HASH', height: '7', committed: true } });
    });

    it('keeps signed bytes and account data out of storage', async () => {
      const { service, txRequest, keyValueStore, address } = await setup();
      const connect = service.parseRequestUrl(buildDappRequestUrl(payload({ id: 'req-c' })));
      const request = txRequest({ method: 'sign-transaction' });
      const context = service.resolveContext(request);
      const { draft } = await service.prepareTransaction(request, context);
      const signed = readResponse(await service.approveTransaction(request, context, draft));

      service.approveConnect(connect, service.resolveContext(connect));
      const stored = keyValueStore.getString('processed-dapp-requests') ?? '';

      expect(stored).not.toContain(signed.data.signedTx);
      expect(stored).not.toContain(address);
      expect(readResponse(service.answerDuplicate(txRequest({ method: 'sign-transaction' })))).toEqual({
        requestId: 'req-1', status: 'failure', error: { code: 'DUPLICATE_REQUEST', message: 'This request was already answered.' },
      });
    });

    it('persists processed requests in storage', async () => {
      const env = createTestContainer();
      const request = env.container.dappService.parseRequestUrl(buildDappRequestUrl(payload()));

      env.container.dappService.reject(request);
      expect(env.keyValueStore.getString('processed-dapp-requests')).toContain('req-1');
    });
  });

  describe('caller package', () => {
    it('attaches a well-formed Android caller package only', async () => {
      const { service } = await setup();
      const url = buildDappRequestUrl(payload());

      expect(service.parseRequestUrl(url, 'com.android.chrome').callerPackage).toBe('com.android.chrome');
      expect(service.parseRequestUrl(url, 'not a package').callerPackage).toBeUndefined();
      expect(service.parseRequestUrl(url).callerPackage).toBeUndefined();
    });

    it('scopes a connection to the caller package that connected', async () => {
      const { service, txRequest, container, account, network } = await setup({ connected: false });
      const connectUrl = buildDappRequestUrl(payload({ id: 'connect-1' }));
      const connect = service.parseRequestUrl(connectUrl, 'com.example.wallet');

      service.approveConnect(connect, service.resolveContext(connect));
      const sameCaller = { ...txRequest({ id: 'tx-1' }), callerPackage: 'com.example.wallet' };
      const otherCaller = { ...txRequest({ id: 'tx-2' }), callerPackage: 'com.evil.app' };
      const noCaller = txRequest({ id: 'tx-3' });

      expect(() => service.resolveContext(sameCaller)).not.toThrow();
      expect(await codeOf(() => service.resolveContext(otherCaller))).toBe('NOT_CONNECTED');
      expect(await codeOf(() => service.resolveContext(noCaller))).toBe('NOT_CONNECTED');
      expect(container.connectedAppService.find(ORIGIN, account.id, network.id, 'com.example.wallet')).toMatchObject({ callerPackage: 'com.example.wallet' });
    });
  });

  describe('connected app metadata', () => {
    it('keeps the name and icon stored at connect time when a transaction is approved', async () => {
      const { container, service, txRequest, account, network } = await setup();
      const request = txRequest({ dapp: { name: 'Impostor', icon: 'https://evil.example/icon.png' } });
      const context = service.resolveContext(request);
      const { draft } = await service.prepareTransaction(request, context);

      await service.approveTransaction(request, context, draft);
      expect(container.connectedAppService.find(ORIGIN, account.id, network.id)).toMatchObject({ name: 'Example' });
    });
  });
});
