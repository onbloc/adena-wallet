import { isAppError } from '../../../src/core/errors';
import { FeeEstimate, GNO_FEE_POLICY } from '../../../src/domain/fee';
import { getNativeTokenFor } from '../../../src/resources';
import { catchError, makeToken, networkById } from '../../helpers/service-fakes';
import { createTestContainer, TEST_MNEMONIC, TEST_PASSWORD } from '../../helpers/test-container';

const RECIPIENT = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';

const setup = async () => {
  const env = createTestContainer();
  const account = await env.container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });
  const network = env.container.networkService.getCurrentNetwork();
  const address = env.container.accountService.getAddress(account, network);
  const service = env.container.transactionService;

  return { ...env, service, account, network, address, gnot: getNativeTokenFor(network) };
};

const codeOf = async (run: () => unknown) => {
  const error = await catchError(run);

  return isAppError(error) ? error.code : error;
};

const estimate = (overrides: Partial<FeeEstimate> = {}): FeeEstimate => ({
  gasUsed: '100000', gasPrice: '0.001', denom: 'ugnot', policy: GNO_FEE_POLICY, ...overrides,
});

describe('TransactionService', () => {
  describe('createTransferDraft', () => {
    it('builds an unpriced draft on the network', async () => {
      const { service, account, network, gnot } = await setup();
      const draft = await service.createTransferDraft({ account, network, token: gnot, toAddress: RECIPIENT, amount: '10' });

      expect(draft).toMatchObject({ networkId: network.id, chainId: network.chainId, fee: { gasWanted: '0', gasFee: '' }, memo: '' });
      expect(draft.messages).toHaveLength(1);
      expect((await service.createTransferDraft({ account, network, token: gnot, toAddress: RECIPIENT, amount: '10', memo: 'hi' })).memo).toBe('hi');
    });

    it.each([['g1invalid'], ['atone1jg8mtutu9khhfwc4nxmuhcpftf0pajdh8u4qe0'], ['']])('rejects the recipient %p', async (toAddress) => {
      const { service, account, network, gnot } = await setup();

      expect(await codeOf(() => service.createTransferDraft({ account, network, token: gnot, toAddress, amount: '10' }))).toBe('INVALID_ADDRESS');
    });

    it.each(['0', '-5'])('rejects the amount %p', async (amount) => {
      const { service, account, network, gnot } = await setup();

      expect(await codeOf(() => service.createTransferDraft({ account, network, token: gnot, toAddress: RECIPIENT, amount }))).toBe('INVALID_AMOUNT');
    });
  });

  describe('createDraft', () => {
    it('parses raw dApp messages for the account signer and describes them', async () => {
      const { service, account, network, address } = await setup();
      const draft = service.createDraft(account, network, [{ type: '/bank.MsgSend', value: { from_address: address, to_address: RECIPIENT, amount: '5ugnot' } }], 'memo');

      expect(draft).toMatchObject({ networkId: network.id, memo: 'memo', fee: { gasWanted: '0', gasFee: '' } });
      expect(service.describe(draft, network).map(summary => summary.title)).toEqual(['Transfer']);
    });

    it('rejects messages signed by another address', async () => {
      const { service, account, network } = await setup();

      expect(await codeOf(() => service.createDraft(account, network, [{ type: '/bank.MsgSend', value: { from_address: RECIPIENT, to_address: RECIPIENT, amount: '5ugnot' } }], ''))).toBe('INVALID_REQUEST');
    });

    it('rejects more than 16 messages', async () => {
      const { service, account, network, address } = await setup();
      const message = { type: '/bank.MsgSend', value: { from_address: address, to_address: RECIPIENT, amount: '1ugnot' } };

      expect(service.createDraft(account, network, Array(16).fill(message), '').messages).toHaveLength(16);
      expect(await codeOf(() => service.createDraft(account, network, Array(17).fill(message), ''))).toBe('INVALID_REQUEST');
      expect(await codeOf(() => service.createDraft(account, network, [], ''))).toBe('INVALID_REQUEST');
    });
  });

  describe('fees', () => {
    it('estimates with the key while unlocked and without it while locked', async () => {
      const { container, service, account, network, gnot } = await setup();
      const chain = container.chainRegistry.forNetwork(network);
      const spy = jest.spyOn(chain, 'estimateFee');
      const draft = await service.createTransferDraft({ account, network, token: gnot, toAddress: RECIPIENT, amount: '10' });

      await service.estimateFee(draft, account, network);
      const withKey = spy.mock.calls[0][1].withKey;

      expect(await withKey?.(async key => key.publicKey.length)).toBe(33);
      container.walletService.lock();
      await catchError(() => service.estimateFee(draft, account, network));
      expect(spy.mock.calls[1][1].withKey).toBeUndefined();
      expect(spy.mock.calls[1][1].publicKey).toHaveLength(33);
    });

    it('applies the selected tier and adjustment', async () => {
      const { service, account, network, gnot } = await setup();
      const draft = await service.createTransferDraft({ account, network, token: gnot, toAddress: RECIPIENT, amount: '10' });

      expect(service.applyFee(draft, estimate()).fee).toEqual({ gasWanted: '110000', gasFee: '110ugnot' });
      expect(service.applyFee(draft, estimate(), { tier: 'FAST', adjustment: 2 }).fee).toEqual({ gasWanted: '240000', gasFee: '240ugnot' });
      expect((await service.withEstimatedFee(draft, account, network, { tier: 'SLOW', adjustment: 1 })).fee).toEqual({ gasWanted: '100000', gasFee: '100ugnot' });
    });
  });

  describe('maxTransferAmount', () => {
    it('returns the whole balance for tokens that do not pay the fee', async () => {
      const { service, account, network } = await setup();

      expect(await service.maxTransferAmount({ account, network, token: makeToken({ denom: 'foo' }), toAddress: RECIPIENT, balance: '500' })).toBe('500');
    });

    it('returns a zero balance without estimating', async () => {
      const { service, account, network, gnot } = await setup();
      const spy = jest.spyOn(service, 'estimateFee');

      expect(await service.maxTransferAmount({ account, network, token: gnot, toAddress: RECIPIENT, balance: '0' })).toBe('0');
      expect(spy).not.toHaveBeenCalled();
    });

    it('reserves the padded fee and the storage deposit', async () => {
      const { service, account, network, gnot } = await setup();

      jest.spyOn(service, 'estimateFee').mockResolvedValue(estimate({ storageDeposit: '1000' }));
      // 110000 gas * 0.001 * 1.2 = 132; 1_000_000 - 132 - 1000.
      expect(await service.maxTransferAmount({ account, network, token: gnot, toAddress: RECIPIENT, balance: '1000000' })).toBe('998868');
    });

    it('simulates with the full balance when 90% rounds to zero', async () => {
      const { service, account, network, gnot } = await setup();
      const draftSpy = jest.spyOn(service, 'createTransferDraft');

      jest.spyOn(service, 'estimateFee').mockResolvedValue(estimate());
      expect(await service.maxTransferAmount({ account, network, token: gnot, toAddress: RECIPIENT, balance: '1' })).toBe('0');
      expect(draftSpy.mock.calls[0][0].amount).toBe('1');
    });

    it('never goes below zero when the fee exceeds the balance', async () => {
      const { service, account, network, gnot } = await setup();

      jest.spyOn(service, 'estimateFee').mockResolvedValue(estimate({ storageDeposit: '5000' }));
      expect(await service.maxTransferAmount({ account, network, token: gnot, toAddress: RECIPIENT, balance: '4000' })).toBe('0');
    });
  });

  describe('assertSufficientFunds', () => {
    const priced = async (env: Awaited<ReturnType<typeof setup>>, gasFee = '110ugnot') => ({
      ...(await env.service.createTransferDraft({ account: env.account, network: env.network, token: env.gnot, toAddress: RECIPIENT, amount: '1' })),
      fee: { gasWanted: '110000', gasFee },
    });

    it('skips the balance query when nothing is required', async () => {
      const env = await setup();
      const spy = jest.spyOn(env.container.chainRegistry.assets(env.network), 'getBalances');

      await env.service.assertSufficientFunds(await priced(env, ''), env.account, env.network);
      expect(spy).not.toHaveBeenCalled();
    });

    it('reports a missing fee coin separately from the transferred token', async () => {
      const env = await setup();
      const foo = makeToken();
      const balances = jest.spyOn(env.container.chainRegistry.assets(env.network), 'getBalances');
      const draft = await priced(env);

      balances.mockResolvedValue({ ugnot: '109', [foo.id]: '10' });
      await expect(catchError(() => env.service.assertSufficientFunds(draft, env.account, env.network, { token: foo, amount: '10' }))).resolves.toThrow('Insufficient GNOT for the network fee');
      balances.mockResolvedValue({ ugnot: '110', [foo.id]: '9' });
      await expect(catchError(() => env.service.assertSufficientFunds(draft, env.account, env.network, { token: foo, amount: '10' }))).resolves.toThrow('Insufficient FOO balance');
      balances.mockResolvedValue({ ugnot: '110', [foo.id]: '10' });
      await expect(env.service.assertSufficientFunds(draft, env.account, env.network, { token: foo, amount: '10' })).resolves.toBeUndefined();
    });

    it('adds fee, storage deposit and amount when the fee coin is transferred', async () => {
      const env = await setup();
      const draft = await priced(env);

      env.gno.state.balances[env.address] = '1110ugnot';
      await expect(env.service.assertSufficientFunds(draft, env.account, env.network, { token: env.gnot, amount: '1000' })).resolves.toBeUndefined();
      await expect(catchError(() => env.service.assertSufficientFunds(draft, env.account, env.network, { token: env.gnot, amount: '1000' }, '1'))).resolves.toThrow('Insufficient GNOT balance');
    });

    it('treats an unknown balance as zero', async () => {
      const env = await setup();

      jest.spyOn(env.container.chainRegistry.assets(env.network), 'getBalances').mockResolvedValue({});
      expect(await codeOf(async () => env.service.assertSufficientFunds(await priced(env), env.account, env.network))).toBe('INSUFFICIENT_BALANCE');
    });

    it('only checks the transfer when the fee is in an unlisted denom', async () => {
      const env = await setup();
      const balances = jest.spyOn(env.container.chainRegistry.assets(env.network), 'getBalances').mockResolvedValue({ ugnot: '5' });

      await env.service.assertSufficientFunds(await priced(env, '100uother'), env.account, env.network, { token: env.gnot, amount: '5' });
      expect(balances.mock.calls[0][1].map(token => token.id)).toEqual(['ugnot']);
    });
  });

  describe('signing', () => {
    it('signs and broadcasts', async () => {
      const { service, account, network, gnot, gno } = await setup();
      const draft = await service.withEstimatedFee(await service.createTransferDraft({ account, network, token: gnot, toAddress: RECIPIENT, amount: '1' }), account, network);
      const signed = await service.sign(draft, account, network);

      expect(signed.encoded).toEqual(expect.any(String));
      await expect(service.broadcast(signed, network)).resolves.toMatchObject({ hash: 'HASH' });
      expect(gno.state.broadcasts).toEqual([signed.encoded]);
    });

    it('refuses a draft built for another network', async () => {
      const { service, account, network, gnot } = await setup();
      const draft = await service.createTransferDraft({ account, network, token: gnot, toAddress: RECIPIENT, amount: '1' });
      const onyx = networkById('onyx-1');

      expect(await codeOf(() => service.sign(draft, account, onyx))).toBe('NETWORK_MISMATCH');
      expect(await codeOf(() => service.sign({ ...draft, chainId: 'other' }, account, network))).toBe('NETWORK_MISMATCH');
    });

    it('cannot sign or broadcast while locked', async () => {
      const { container, service, account, network, gnot, gno } = await setup();
      const draft = await service.createTransferDraft({ account, network, token: gnot, toAddress: RECIPIENT, amount: '1' });

      container.walletService.lock();
      expect(await codeOf(() => service.signAndBroadcast({ ...draft, fee: { gasWanted: '1', gasFee: '1ugnot' } }, account, network))).toBe('WALLET_LOCKED');
      expect(gno.state.broadcasts).toEqual([]);
    });
  });
});
