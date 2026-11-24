import { fromBase64 } from '@cosmjs/encoding';
import { Tx } from '@gnolang/tm2-js-client';

import { AppError, isAppError } from '../../../src/core/errors';
import { decodeBase64Url } from '../../../src/deeplink/base64url';
import { buildDappRequestUrl, DappRequestPayload } from '../../../src/deeplink/dapp-protocol';
import { DappTransactionRequest } from '../../../src/domain/dapp';
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
    service.parseRequestUrl(buildDappRequestUrl(payload({ method: 'sign-and-broadcast', chainId: 'gnoland-1', params, ...overrides }))) as DappTransactionRequest;

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
      expect(spy).not.toHaveBeenCalled();
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

  describe('failure responses', () => {
    it('rejects with USER_REJECTED', async () => {
      const { service } = await setup();

      expect(readResponse(service.reject(service.parseRequestUrl(buildDappRequestUrl(payload()))))).toEqual({
        requestId: 'req-1', status: 'failure', error: { code: 'USER_REJECTED', message: 'User rejected the request' },
      });
    });

    it('maps unknown errors to TRANSACTION_FAILED', async () => {
      const { service } = await setup();
      const request = service.parseRequestUrl(buildDappRequestUrl(payload()));

      expect(readResponse(service.fail(request, new AppError('INSUFFICIENT_BALANCE', 'Not enough'))).error).toEqual({ code: 'INSUFFICIENT_BALANCE', message: 'Not enough' });
      expect(readResponse(service.fail(request, new Error('rpc down'))).error).toEqual({ code: 'TRANSACTION_FAILED', message: 'rpc down' });
      expect(readResponse(service.fail(request, 'weird')).error).toEqual({ code: 'TRANSACTION_FAILED', message: 'Request failed' });
    });
  });
});
