import { InsufficientFeeError, InvalidSequenceError } from '@gnolang/tm2-js-client';

import { isAppError } from '../../../src/core/errors';
import { Account } from '../../../src/domain/account';
import { FeeEstimate, GNO_FEE_POLICY } from '../../../src/domain/fee';
import { Network } from '../../../src/domain/network';
import { BroadcastResult, SignedTransaction, TransactionDraft } from '../../../src/domain/transaction';
import { StorageKey } from '../../../src/migration/storage-keys';
import { ChainRegistry } from '../../../src/repositories/chain/chain-registry';
import { StoragePendingBroadcastRepository } from '../../../src/repositories/pending-broadcast.repository';
import { getNativeTokenFor } from '../../../src/resources';
import { AccountService } from '../../../src/services/account.service';
import { KeyringSession } from '../../../src/services/keyring-session';
import { TransactionService } from '../../../src/services/transaction.service';
import { writeJson } from '../../../src/storage/key-value-store';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';
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

// Every record resolved by one hash, nothing left.
const settledAs = (status: 'committed' | 'failed', hash: string, id = hash) => ({ status: 'none', settled: [{ id, status, hash }] });

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
      // Simulated 100000 gas plus 230 gas of fee-size headroom.
      expect((await service.withEstimatedFee(draft, account, network, { tier: 'SLOW', adjustment: 1 })).fee).toEqual({ gasWanted: '100230', gasFee: '101ugnot' });
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

  describe('pending broadcast record', () => {
    type Env = Awaited<ReturnType<typeof setup>>;

    const signedDraft = async ({ service, account, network, gnot }: Env) =>
      service.withEstimatedFee(await service.createTransferDraft({ account, network, token: gnot, toAddress: RECIPIENT, amount: '1' }), account, network);

    // A broadcast whose response never arrives until the test settles it.
    const hangBroadcast = (env: Env) => {
      let fail!: (error: unknown) => void;
      const sent = new Promise<void>((sentDone) => {
        env.gno.provider.sendTransaction = (encoded: string) => new Promise<never>((_, reject) => {
          env.gno.state.broadcasts.push(encoded);
          fail = reject;
          sentDone();
        });
      });

      return { sent, fail: (error: unknown) => fail(error) };
    };

    const repositoryOf = (env: Env) => new StoragePendingBroadcastRepository(env.keyValueStore);
    const recordOf = (env: Env) => repositoryOf(env).list(env.account.id, env.network.chainId)[0];
    const restartedService = (env: Env) =>
      new TransactionService(env.container.chainRegistry, env.container.accountService, env.container.keyringSession, repositoryOf(env));
    const hashOf = (env: Env, encoded: string) => env.container.chainRegistry.forNetwork(env.network).transactionHash({ encoded });

    // Killed after the record was saved, while the adapter was still preparing the provider: the node never saw it.
    const killBeforeBroadcast = async (env: Env, draft: TransactionDraft, network: Network = env.network): Promise<string> => {
      const chain = env.container.chainRegistry.forNetwork(network);
      const broadcast = jest.spyOn(chain, 'broadcastTransaction').mockImplementationOnce(() => new Promise<never>(() => undefined));

      void env.service.signAndBroadcast(draft, env.account, network);
      await new Promise(setImmediate);
      expect(broadcast).toHaveBeenCalledTimes(1);
      expect(env.gno.state.broadcasts).toEqual([]);
      broadcast.mockRestore();

      return recordOf(env)!.hashes[0];
    };

    it('keeps the hash saved while the broadcast response is pending and refuses a send after a restart', async () => {
      const env = await setup();
      const draft = await signedDraft(env);
      const hanging = hangBroadcast(env);
      const result = env.service.signAndBroadcast(draft, env.account, env.network).catch((error: unknown) => error);

      await hanging.sent;
      const signed = env.gno.state.broadcasts[0];
      const hash = hashOf(env, signed);

      expect(recordOf(env)).toEqual({ id: hash, hashes: [hash], accountId: env.account.id, chainId: env.network.chainId, createdAt: expect.any(Number), sequence: '3', accountNumber: '7' });

      // Killed here: a fresh service over the same storage still sees the in-flight tx.
      const restarted = restartedService(env);

      expect(await codeOf(() => restarted.signAndBroadcast(draft, env.account, env.network))).toBe('PREVIOUS_TRANSACTION_PENDING');
      expect(env.gno.state.broadcasts).toHaveLength(1);

      // Settle the hanging call so nothing is left open; a transport failure keeps the record.
      hanging.fail(new Error('socket closed'));
      expect(await result).toMatchObject({ code: 'TRANSACTION_PENDING', hash });
      expect(recordOf(env)?.hashes).toEqual([hash]);
    });

    it('removes the record once the broadcast commits', async () => {
      const env = await setup();

      await expect(env.service.signAndBroadcast(await signedDraft(env), env.account, env.network)).resolves.toMatchObject({ hash: 'HASH' });
      expect(recordOf(env)).toBeUndefined();
    });

    it('removes the record on a definitive rejection so the user can retry', async () => {
      const env = await setup();
      const draft = await signedDraft(env);

      env.gno.provider.sendTransaction = async () => {
        throw new InsufficientFeeError('fee too low');
      };

      expect(await codeOf(() => env.service.signAndBroadcast(draft, env.account, env.network))).toBe('TRANSACTION_FAILED');
      expect(recordOf(env)).toBeUndefined();
    });

    it('refuses to sign or broadcast while a record exists for the account and network', async () => {
      const env = await setup();
      const draft = await signedDraft(env);
      const sign = jest.spyOn(env.service, 'sign');

      repositoryOf(env).add({ hashes: ['EARLIER'], accountId: env.account.id, chainId: env.network.chainId, createdAt: 0 });

      expect(await codeOf(() => env.service.signAndBroadcast(draft, env.account, env.network))).toBe('PREVIOUS_TRANSACTION_PENDING');
      expect(sign).not.toHaveBeenCalled();
      expect(env.gno.state.broadcasts).toEqual([]);
      expect(recordOf(env)?.hashes).toEqual(['EARLIER']);
    });

    it('refuses a second send that starts while the first is still signing', async () => {
      const env = await setup();
      const draft = await signedDraft(env);
      const first = env.service.signAndBroadcast(draft, env.account, env.network);
      const second = env.service.signAndBroadcast(draft, env.account, env.network);

      await expect(first).resolves.toMatchObject({ hash: 'HASH' });
      expect(await codeOf(() => second)).toBe('PREVIOUS_TRANSACTION_PENDING');
      expect(env.gno.state.broadcasts).toHaveLength(1);
    });

    describe('reconciling by the account sequence', () => {
      it('allows a pinned resend with the same sequence after a kill before the tx was sent', async () => {
        const env = await setup();
        const draft = await signedDraft(env);
        const original = await killBeforeBroadcast(env, draft);
        const restarted = restartedService(env);
        const chain = env.container.chainRegistry.forNetwork(env.network);
        const sign = jest.spyOn(chain, 'signTransaction');

        await expect(restarted.reconcilePending(env.account, env.network)).resolves.toEqual({ status: 'replaceable', sequence: '3', settled: [] });
        expect(await codeOf(() => restarted.signAndBroadcast(draft, env.account, env.network))).toBe('PREVIOUS_TRANSACTION_PENDING');

        let recordDuringBroadcast: unknown;

        env.gno.provider.sendTransaction = async (encoded: string) => {
          recordDuringBroadcast = recordOf(env);
          env.gno.state.broadcasts.push(encoded);
          return { hash: 'HASH', height: '42', deliver_tx: { ResponseBase: { Data: null } }, check_tx: {} } as never;
        };

        const edited = { ...draft, memo: 'edited' };

        await expect(restarted.signAndBroadcast(edited, env.account, env.network, { replacePending: true })).resolves.toMatchObject({ committed: true });
        expect(sign).toHaveBeenLastCalledWith(edited, expect.anything(), env.network, { sequence: '3', accountNumber: '7' });
        expect(await sign.mock.results.at(-1)!.value).toMatchObject({ sequence: '3' });
        // Both hashes are tracked before the replacement goes out.
        expect(recordDuringBroadcast).toMatchObject({ hashes: [original, hashOf(env, env.gno.state.broadcasts[0])], sequence: '3' });
        expect(env.gno.state.broadcasts).toHaveLength(1);
        expect(recordOf(env)).toBeUndefined();
      });

      it('clears the record and allows a normal send once the sequence advanced without the hash', async () => {
        const env = await setup();
        const draft = await signedDraft(env);

        await killBeforeBroadcast(env, draft);
        env.gno.state.sequence = '4';
        const restarted = restartedService(env);

        await expect(restarted.reconcilePending(env.account, env.network)).resolves.toEqual({ status: 'none', settled: [{ id: expect.any(String), status: 'not_included' }] });
        expect(recordOf(env)).toBeUndefined();
        await expect(restarted.signAndBroadcast(draft, env.account, env.network)).resolves.toMatchObject({ hash: 'HASH' });
      });

      it('resolves a committed or failed hash and removes the record', async () => {
        const env = await setup();
        const draft = await signedDraft(env);
        const hash = await killBeforeBroadcast(env, draft);

        env.gno.state.transactions[hash] = 'committed';
        env.gno.state.sequence = '4';
        await expect(restartedService(env).reconcilePending(env.account, env.network)).resolves.toEqual(settledAs('committed', hash));
        expect(recordOf(env)).toBeUndefined();

        repositoryOf(env).add({ hashes: ['F'], accountId: env.account.id, chainId: env.network.chainId, createdAt: 0, sequence: '4' });
        env.gno.state.transactions.F = 'failed';
        await expect(env.service.reconcilePending(env.account, env.network)).resolves.toEqual(settledAs('failed', 'F'));
        expect(recordOf(env)).toBeUndefined();
      });

      it('rechecks the hash after reading the sequence, so a commit in between is not reported as not included', async () => {
        const env = await setup();
        const hash = await killBeforeBroadcast(env, await signedDraft(env));
        const getAccount = env.gno.provider.getAccount.bind(env.gno.provider);

        env.gno.provider.getAccount = async (...args: Parameters<typeof getAccount>) => {
          env.gno.state.transactions[hash] = 'committed';
          env.gno.state.sequence = '4';
          return getAccount(...args);
        };

        await expect(env.service.reconcilePending(env.account, env.network)).resolves.toEqual(settledAs('committed', hash));
      });

      it('stays blocked when any lookup fails during reconcile', async () => {
        const env = await setup();
        const draft = await signedDraft(env);

        await killBeforeBroadcast(env, draft);
        env.gno.state.sequence = '4';
        env.gno.provider.getAccount = async () => {
          throw new Error('socket hang up');
        };

        await expect(env.service.reconcilePending(env.account, env.network)).resolves.toEqual({ status: 'pending', settled: [] });
        env.gno.provider.getTransaction = async () => {
          throw new Error('timeout');
        };

        await expect(env.service.reconcilePending(env.account, env.network)).resolves.toEqual({ status: 'pending', settled: [] });
        expect(recordOf(env)).toBeDefined();
        expect(await codeOf(() => env.service.signAndBroadcast(draft, env.account, env.network))).toBe('PREVIOUS_TRANSACTION_PENDING');
      });

      it('rejects a replacement once the original commits, and resolves the record as committed', async () => {
        const env = await setup();
        const draft = await signedDraft(env);
        const original = await killBeforeBroadcast(env, draft);

        await expect(env.service.reconcilePending(env.account, env.network)).resolves.toMatchObject({ status: 'replaceable' });

        // The original lands while an edited replacement is in flight; the node rejects the reused sequence.
        env.gno.provider.sendTransaction = async (encoded: string) => {
          env.gno.state.broadcasts.push(encoded);
          env.gno.state.transactions[original] = 'committed';
          env.gno.state.sequence = '4';
          throw new InvalidSequenceError('account sequence mismatch');
        };

        expect(await codeOf(() => env.service.signAndBroadcast({ ...draft, memo: 'edited' }, env.account, env.network, { replacePending: true }))).toBe('TRANSACTION_FAILED');
        expect(recordOf(env)?.hashes).toEqual([original]);
        // The same draft re-signed is the same tx: its rejection keeps the original hash tracked.
        expect(await codeOf(() => env.service.signAndBroadcast(draft, env.account, env.network, { replacePending: true }))).toBe('PREVIOUS_TRANSACTION_PENDING');
        expect(recordOf(env)?.hashes).toEqual([original]);
        await expect(env.service.reconcilePending(env.account, env.network)).resolves.toEqual(settledAs('committed', original));

        // Committed before signing: the pinned path refuses without broadcasting.
        env.gno.state.broadcasts = [];
        const second = await killBeforeBroadcast(env, draft);

        env.gno.state.transactions[second] = 'committed';
        env.gno.state.sequence = '5';
        expect(await codeOf(() => env.service.signAndBroadcast(draft, env.account, env.network, { replacePending: true }))).toBe('PREVIOUS_TRANSACTION_PENDING');
        expect(env.gno.state.broadcasts).toEqual([]);
      });

      it('keeps the original hash when a re-send of the identical tx is rejected', async () => {
        const env = await setup();
        const draft = await signedDraft(env);
        const original = await killBeforeBroadcast(env, draft);

        await env.service.reconcilePending(env.account, env.network);
        env.gno.provider.sendTransaction = async () => {
          throw new InsufficientFeeError('tx already exists in cache');
        };

        expect(await codeOf(() => env.service.signAndBroadcast(draft, env.account, env.network, { replacePending: true }))).toBe('TRANSACTION_FAILED');
        expect(recordOf(env)?.hashes).toEqual([original]);
      });

      it('refuses a pinned send without a record or before a legacy record was checked against the chain', async () => {
        const env = await setup();
        const draft = await signedDraft(env);

        expect(await codeOf(() => env.service.signAndBroadcast(draft, env.account, env.network, { replacePending: true }))).toBe('PREVIOUS_TRANSACTION_PENDING');

        writeJson(env.keyValueStore, StorageKey.PENDING_BROADCASTS, {
          legacy: { hash: 'LEGACY', accountId: env.account.id, networkId: env.network.id, createdAt: 0 },
        });
        expect(await codeOf(() => env.service.signAndBroadcast(draft, env.account, env.network, { replacePending: true }))).toBe('PREVIOUS_TRANSACTION_PENDING');
        expect(env.gno.state.broadcasts).toEqual([]);

        // Its tx used a sequence <= the current one, so the current one becomes the bound to pin and compare.
        await expect(env.service.reconcilePending(env.account, env.network)).resolves.toEqual({ status: 'replaceable', sequence: '3', settled: [] });
        expect(recordOf(env)).toMatchObject({ hashes: ['LEGACY'], sequence: '3' });
        env.gno.state.sequence = '4';
        await expect(env.service.reconcilePending(env.account, env.network)).resolves.toEqual({ status: 'none', settled: [{ id: expect.any(String), status: 'not_included' }] });
      });

      it('blocks a send on another network of the same chain', async () => {
        const env = await setup();
        const draft = await signedDraft(env);
        const custom: Network = { ...env.network, id: `custom:${env.network.chainId}:http://localhost:26657`, isCustom: true };

        await killBeforeBroadcast(env, { ...draft, networkId: custom.id }, custom);
        expect(await codeOf(() => env.service.signAndBroadcast(draft, env.account, env.network))).toBe('PREVIOUS_TRANSACTION_PENDING');
        expect(repositoryOf(env).list(env.account.id, custom.chainId)[0]).toBeDefined();
      });

      describe('several records of one account and chain', () => {
        const recordsOf = (env: Env) => repositoryOf(env).list(env.account.id, env.network.chainId);
        const storedDocument = (env: Env) => env.keyValueStore.getString(StorageKey.PENDING_BROADCASTS) ?? '';

        it('keeps both legacy records of the built-in and a custom network and resolves each on its own', async () => {
          const env = await setup();
          const draft = await signedDraft(env);
          const custom = `custom:${env.network.chainId}:http://localhost:26657`;

          writeJson(env.keyValueStore, StorageKey.PENDING_BROADCASTS, {
            [`${env.account.id}:${env.network.id}`]: { hash: 'DEFAULT', accountId: env.account.id, networkId: env.network.id, createdAt: 1 },
            [`${env.account.id}:${custom}`]: { hash: 'CUSTOM', accountId: env.account.id, networkId: custom, createdAt: 2 },
          });
          expect(recordsOf(env).map(record => record.hashes)).toEqual([['DEFAULT'], ['CUSTOM']]);

          env.gno.state.transactions.DEFAULT = 'committed';
          env.gno.state.sequence = '4';
          const first = await env.service.reconcilePending(env.account, env.network);

          // Resolving the first leaves the second, and it still blocks a send.
          expect(storedDocument(env)).toContain('CUSTOM');
          expect(await codeOf(() => env.service.signAndBroadcast(draft, env.account, env.network))).toBe('PREVIOUS_TRANSACTION_PENDING');
          expect(first).toEqual({ status: 'replaceable', sequence: '4', settled: [{ id: `${env.account.id}:${env.network.id}`, status: 'committed', hash: 'DEFAULT' }] });
          expect(recordsOf(env)).toMatchObject([{ hashes: ['CUSTOM'], sequence: '4' }]);

          env.gno.state.transactions.CUSTOM = 'failed';
          await expect(env.service.reconcilePending(env.account, env.network)).resolves.toMatchObject({ status: 'none', settled: [{ status: 'failed', hash: 'CUSTOM' }] });
          await expect(env.service.signAndBroadcast(draft, env.account, env.network)).resolves.toMatchObject({ committed: true });
          expect(env.gno.state.broadcasts).toHaveLength(1);
        });

        const twoSequences = (env: Env) => {
          const repository = repositoryOf(env);

          repository.add({ hashes: ['LOW'], accountId: env.account.id, chainId: env.network.chainId, createdAt: 1, sequence: '3', accountNumber: '7' });
          repository.add({ hashes: ['HIGH'], accountId: env.account.id, chainId: env.network.chainId, createdAt: 2, sequence: '4', accountNumber: '7' });
        };

        it('resolves records with different sequences independently and unblocks once both are gone', async () => {
          const env = await setup();
          const draft = await signedDraft(env);

          twoSequences(env);
          await expect(env.service.reconcilePending(env.account, env.network)).resolves.toEqual({ status: 'pending', settled: [] });
          expect(recordsOf(env).map(record => record.id)).toEqual(['LOW', 'HIGH']);

          // The higher record's sequence moved on: it is dropped, while the lower one is found committed.
          env.gno.state.transactions.LOW = 'committed';
          env.gno.state.sequence = '5';
          await expect(env.service.reconcilePending(env.account, env.network)).resolves.toEqual({
            status: 'none',
            settled: [{ id: 'LOW', status: 'committed', hash: 'LOW' }, { id: 'HIGH', status: 'not_included' }],
          });
          await expect(env.service.signAndBroadcast(draft, env.account, env.network)).resolves.toMatchObject({ committed: true });
        });

        it('stays blocked while one of the records is still unresolved', async () => {
          const env = await setup();
          const draft = await signedDraft(env);

          twoSequences(env);
          env.gno.state.transactions.LOW = 'committed';
          env.gno.state.sequence = '4';
          await expect(env.service.reconcilePending(env.account, env.network)).resolves.toEqual({
            status: 'replaceable', sequence: '4', settled: [{ id: 'LOW', status: 'committed', hash: 'LOW' }],
          });
          expect(await codeOf(() => env.service.signAndBroadcast(draft, env.account, env.network))).toBe('PREVIOUS_TRANSACTION_PENDING');

          env.gno.state.sequence = '5';
          await expect(env.service.reconcilePending(env.account, env.network)).resolves.toEqual({ status: 'none', settled: [{ id: 'HIGH', status: 'not_included' }] });
          expect(recordsOf(env)).toEqual([]);
        });

        it('offers a pinned replacement for several records pinned to the current sequence and settles them all', async () => {
          const env = await setup();
          const draft = await signedDraft(env);
          const sign = jest.spyOn(env.service, 'sign');
          const repository = repositoryOf(env);

          env.gno.state.sequence = '3';
          repository.add({ hashes: ['A'], accountId: env.account.id, chainId: env.network.chainId, createdAt: 1, sequence: '3', accountNumber: '7' });
          repository.add({ hashes: ['B'], accountId: env.account.id, chainId: env.network.chainId, createdAt: 2, sequence: '3', accountNumber: '7' });
          await expect(env.service.reconcilePending(env.account, env.network)).resolves.toEqual({ status: 'replaceable', sequence: '3', settled: [] });

          // All three txs share sequence 3, so at most one of them can ever commit.
          await expect(env.service.signAndBroadcast(draft, env.account, env.network, { replacePending: true })).resolves.toMatchObject({ committed: true });
          expect(sign).toHaveBeenLastCalledWith(draft, env.account, env.network, { sequence: '3', accountNumber: '7' });
          expect(env.gno.state.broadcasts).toHaveLength(1);
          expect(recordsOf(env)).toEqual([]);
        });

        it('recovers two legacy records that were never sent, without unblocking a normal send', async () => {
          const env = await setup();
          const draft = await signedDraft(env);
          const custom = `custom:${env.network.chainId}:http://localhost:26657`;

          env.gno.state.sequence = '3';
          writeJson(env.keyValueStore, StorageKey.PENDING_BROADCASTS, {
            [`${env.account.id}:${env.network.id}`]: { hash: 'DEFAULT', accountId: env.account.id, networkId: env.network.id, createdAt: 1 },
            [`${env.account.id}:${custom}`]: { hash: 'CUSTOM', accountId: env.account.id, networkId: custom, createdAt: 2 },
          });

          await expect(env.service.reconcilePending(env.account, env.network)).resolves.toEqual({ status: 'replaceable', sequence: '3', settled: [] });
          expect(await codeOf(() => env.service.signAndBroadcast(draft, env.account, env.network))).toBe('PREVIOUS_TRANSACTION_PENDING');
          expect(env.gno.state.broadcasts).toEqual([]);

          await expect(env.service.signAndBroadcast(draft, env.account, env.network, { replacePending: true })).resolves.toMatchObject({ committed: true });
          expect(env.gno.state.broadcasts).toHaveLength(1);
          expect(recordsOf(env)).toEqual([]);
        });

        it('refuses a pinned replacement while the records hold different sequences', async () => {
          const env = await setup();
          const draft = await signedDraft(env);
          const sign = jest.spyOn(env.service, 'sign');

          env.gno.state.sequence = '3';
          twoSequences(env);
          await expect(env.service.reconcilePending(env.account, env.network)).resolves.toEqual({ status: 'pending', settled: [] });
          expect(await codeOf(() => env.service.signAndBroadcast(draft, env.account, env.network, { replacePending: true }))).toBe('PREVIOUS_TRANSACTION_PENDING');
          expect(sign).not.toHaveBeenCalled();
        });

        it('refuses a pinned replacement when another record appears while signing', async () => {
          const env = await setup();
          const draft = await signedDraft(env);
          const repository = repositoryOf(env);
          const sign = env.service.sign.bind(env.service);

          repository.add({ hashes: ['A'], accountId: env.account.id, chainId: env.network.chainId, createdAt: 1, sequence: '3', accountNumber: '7' });
          jest.spyOn(env.service, 'sign').mockImplementationOnce(async (...args) => {
            repository.add({ hashes: ['B'], accountId: env.account.id, chainId: env.network.chainId, createdAt: 2, sequence: '3' });
            return sign(...args);
          });

          expect(await codeOf(() => env.service.signAndBroadcast(draft, env.account, env.network, { replacePending: true }))).toBe('PREVIOUS_TRANSACTION_PENDING');
          expect(env.gno.state.broadcasts).toEqual([]);
          expect(recordsOf(env).map(record => record.hashes)).toEqual([['A'], ['B']]);
        });
      });
    });
  });

  describe('a broadcast only accepted into the mempool', () => {
    const NETWORK = networkById('atomone-1');
    const ACCOUNT = { id: 'acc', keyringId: 'k', hdIndex: 0 } as Account;
    const DRAFT: TransactionDraft = { networkId: NETWORK.id, chainId: NETWORK.chainId, messages: [], fee: { gasWanted: '1', gasFee: '1uphoton' }, memo: '' };

    const setupSync = () => {
      const chain = {
        signTransaction: jest.fn(async (): Promise<SignedTransaction> => ({ encoded: 'AAAA', sequence: '9', accountNumber: '2' })),
        transactionHash: () => 'SYNC',
        broadcastTransaction: jest.fn(async (): Promise<BroadcastResult> => ({ hash: 'SYNC', height: '0', committed: false })),
        findTransaction: jest.fn(async () => null as 'committed' | null),
        getAccountSequence: jest.fn(async () => '9'),
      };
      const repository = new StoragePendingBroadcastRepository(new MemoryKeyValueStore());
      const service = new TransactionService(
        { forNetwork: () => chain } as unknown as ChainRegistry,
        { getAddress: () => 'atone1self' } as unknown as AccountService,
        { withKeyPair: (_id: string, _index: number, task: (key: unknown) => unknown) => task({}) } as unknown as KeyringSession,
        repository,
      );

      return { chain, repository, service };
    };

    it('keeps the record until the tx is found committed', async () => {
      const { chain, repository, service } = setupSync();

      await expect(service.signAndBroadcast(DRAFT, ACCOUNT, NETWORK)).resolves.toEqual({ hash: 'SYNC', height: '0', committed: false });
      expect(repository.list(ACCOUNT.id, NETWORK.chainId)[0]).toMatchObject({ hashes: ['SYNC'], sequence: '9', accountNumber: '2' });
      expect(await codeOf(() => service.signAndBroadcast(DRAFT, ACCOUNT, NETWORK))).toBe('PREVIOUS_TRANSACTION_PENDING');

      chain.findTransaction.mockResolvedValue('committed');
      await expect(service.reconcilePending(ACCOUNT, NETWORK)).resolves.toEqual(settledAs('committed', 'SYNC'));
      expect(repository.list(ACCOUNT.id, NETWORK.chainId)[0]).toBeUndefined();
    });
  });
});

describe('TransactionService.signAndBroadcast onSigned', () => {
  type Env = Awaited<ReturnType<typeof setup>>;

  const signedDraft = async ({ service, account, network, gnot }: Env) =>
    service.withEstimatedFee(await service.createTransferDraft({ account, network, token: gnot, toAddress: RECIPIENT, amount: '1' }), account, network);
  const recordOf = (env: Env) => new StoragePendingBroadcastRepository(env.keyValueStore).list(env.account.id, env.network.chainId)[0];

  it('reports the hash once it is journaled and before the tx is sent', async () => {
    const env = await setup();
    const seen: { hash: string; journaled: string[] | undefined; sent: number }[] = [];

    await env.service.signAndBroadcast(await signedDraft(env), env.account, env.network, {
      onSigned: hash => seen.push({ hash, journaled: recordOf(env)?.hashes, sent: env.gno.state.broadcasts.length }),
    });
    expect(seen).toEqual([{ hash: expect.any(String), journaled: [seen[0].hash], sent: 0 }]);
  });

  it('sends nothing and drops the hash when the hash cannot be reported', async () => {
    const env = await setup();
    const error = await catchError(async () => env.service.signAndBroadcast(await signedDraft(env), env.account, env.network, {
      onSigned: () => {
        throw new Error('storage full');
      },
    }));

    expect((error as Error).message).toBe('storage full');
    expect(env.gno.state.broadcasts).toEqual([]);
    expect(recordOf(env)).toBeUndefined();
  });
});
