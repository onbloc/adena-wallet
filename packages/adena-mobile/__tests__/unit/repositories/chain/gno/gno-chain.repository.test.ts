import { Secp256k1, Secp256k1Signature, sha256 } from '@cosmjs/crypto';
import { fromBase64, toBase64, toHex } from '@cosmjs/encoding';
import { Any } from '@gnolang/gno-js-client';
import { InsufficientFeeError, PubKeySecp256k1, Tx } from '@gnolang/tm2-js-client';

import { AppError } from '../../../../../src/core/errors';
import { deriveKeyPair, KeyPair } from '../../../../../src/crypto/key-pair';
import { mnemonicToSeed } from '../../../../../src/crypto/mnemonic';
import { GNO_FEE_POLICY } from '../../../../../src/domain/fee';
import { DEFAULT_GNO_FEE_POLICY, GnoChainRepository } from '../../../../../src/repositories/chain/gno/gno-chain.repository';
import { GnoMessage } from '../../../../../src/repositories/chain/gno/gno-messages';
import { feeSizeHeadroomBytes } from '../../../../../src/repositories/chain/gno/gno-tx-encoder';
import { BUILT_IN_NETWORKS } from '../../../../../src/resources';
import { createFakeGnoProvider, txNotFoundError } from '../../../../helpers/fake-gno-provider';
import { TEST_MNEMONIC } from '../../../../helpers/test-container';

const network = { ...BUILT_IN_NETWORKS[0], chainId: 'test-chain' };
const RECIPIENT = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';

// The fake node reports Block.MaxGas 3B, which becomes the probe gas_wanted.
const PROBE_GAS_WANTED = 3_000_000_000n;
// Gas added for the final fee encoding longer than the probe fee (10 gas per byte).
const FEE_HEADROOM_GAS = feeSizeHeadroomBytes({ gasWanted: PROBE_GAS_WANTED.toString(), gasFee: '1ugnot' }, 'ugnot') * 10;

type MutableProvider = Record<string, (...args: never[]) => unknown>;

let keyPair: KeyPair;
let caller: string;

beforeAll(async () => {
  keyPair = await deriveKeyPair(await mnemonicToSeed(TEST_MNEMONIC), 0);
  caller = new GnoChainRepository(createFakeGnoProvider().factory).deriveAddress(keyPair.publicKey, network);
});

const setup = (overrides: Parameters<typeof createFakeGnoProvider>[0] = {}) => {
  const fake = createFakeGnoProvider({ chainId: network.chainId, ...overrides });

  return { ...fake, mutable: fake.provider as unknown as MutableProvider, repository: new GnoChainRepository(fake.factory) };
};

const failingFactory = async () => {
  throw new Error('dial failed');
};

const errorOf = async (promise: Promise<unknown>): Promise<AppError> => promise.then(
  () => {
    throw new Error('expected rejection');
  },
  (error: AppError) => error,
);

const send = (): GnoMessage => ({ type: '/bank.MsgSend', value: { from_address: caller, to_address: RECIPIENT, amount: '1000ugnot' } });
const run = (body = 'package main\nfunc main() {}'): GnoMessage => ({
  type: '/vm.m_run',
  value: { caller, send: '', max_deposit: '', package: { name: 'main', path: '', files: [{ name: 'main.gno', body }] } },
});
const addpkg = (): GnoMessage => ({
  type: '/vm.m_addpkg',
  value: { creator: caller, send: '', max_deposit: '', package: { name: 'x', path: 'gno.land/r/demo/x', files: [{ name: 'x.gno', body: 'package x' }] } },
});
const draftOf = (messages: GnoMessage[], memo = '') => ({ networkId: network.id, chainId: network.chainId, messages, memo, fee: { gasWanted: '200000', gasFee: '200ugnot' } });

const storageEvent = (typeUrl: string, fee: string): Any => {
  const bytes = new TextEncoder().encode(fee);

  return Any.create({ type_url: typeUrl, value: new Uint8Array([0x12, bytes.length, ...bytes]) });
};

describe('GnoChainRepository', () => {
  it('exposes the family and default fee policy', () => {
    expect(setup().repository.family).toBe('gno');
    expect(DEFAULT_GNO_FEE_POLICY).toEqual({
      defaultGasPrice: { amount: 1, gas: 1000 },
      simulationGasWanted: '100000000',
      unboundedSimulationGasWanted: '3000000000',
      txSizeCostPerByte: 10,
    });
  });

  describe('addresses', () => {
    it('derives bech32 addresses with the network prefix', () => {
      const { repository } = setup();

      expect(caller.startsWith('g1')).toBe(true);
      expect(repository.deriveAddress(keyPair.publicKey, { ...network, addressPrefix: 'atone' }).startsWith('atone1')).toBe(true);
    });

    it('validates addresses against the prefix', () => {
      const { repository } = setup();

      expect(repository.isValidAddress(RECIPIENT, network)).toBe(true);
      expect(repository.isValidAddress(RECIPIENT.slice(0, -1), network)).toBe(false);
      expect(repository.isValidAddress('', network)).toBe(false);
      expect(repository.isValidAddress(RECIPIENT, { ...network, addressPrefix: 'atone' })).toBe(false);
    });
  });

  describe('getChainId', () => {
    it('reads the RPC network', async () => {
      await expect(setup({ chainId: 'other' }).repository.getChainId(network)).resolves.toBe('other');
    });

    it('wraps failures as NETWORK_ERROR and passes AppErrors through', async () => {
      const { repository, mutable } = setup();

      mutable.getStatus = async () => {
        throw new Error('timeout');
      };

      await expect(errorOf(repository.getChainId(network))).resolves.toMatchObject({ code: 'NETWORK_ERROR', message: 'timeout' });

      const appError = new AppError('INVALID_REQUEST', 'custom');

      mutable.getStatus = async () => {
        throw appError;
      };

      await expect(repository.getChainId(network)).rejects.toBe(appError);

      mutable.getStatus = async () => {
        throw 'string failure';
      };

      await expect(errorOf(repository.getChainId(network))).resolves.toMatchObject({ code: 'NETWORK_ERROR', message: 'NETWORK_ERROR' });
    });

    it('wraps provider creation failures', async () => {
      await expect(errorOf(new GnoChainRepository(failingFactory).getChainId(network))).resolves.toMatchObject({ code: 'NETWORK_ERROR', message: 'dial failed' });
    });

    it('wraps malformed status payloads', async () => {
      const { repository, mutable } = setup();

      mutable.getStatus = async () => ({});
      await expect(errorOf(repository.getChainId(network))).resolves.toMatchObject({ code: 'NETWORK_ERROR' });
    });
  });

  describe('getNativeBalance', () => {
    const balanceWith = async (data: string | null) => {
      const { repository, mutable } = setup();

      mutable.abciQuery = async () => ({ response: { ResponseBase: { Data: data } } });
      return repository.getNativeBalance(RECIPIENT, network);
    };
    const encode = (text: string) => toBase64(new TextEncoder().encode(text));

    it('reads JSON-encoded coin lists', async () => {
      await expect(balanceWith(encode('"5foo,1000ugnot"'))).resolves.toEqual({ denom: 'ugnot', symbol: 'GNOT', decimals: 6, amount: '1000' });
    });

    it('reads bare coin strings and non-string JSON as text', async () => {
      await expect(balanceWith(encode('42ugnot'))).resolves.toMatchObject({ amount: '42' });
      await expect(balanceWith(encode('12'))).resolves.toMatchObject({ amount: '0' });
    });

    it('reports 0 for null, empty or foreign-denom data', async () => {
      await expect(balanceWith(null)).resolves.toMatchObject({ amount: '0' });
      await expect(balanceWith(encode('""'))).resolves.toMatchObject({ amount: '0' });
      await expect(balanceWith(encode('"5foo"'))).resolves.toMatchObject({ amount: '0' });
    });

    it('wraps query failures and malformed responses', async () => {
      const { repository, mutable } = setup();

      mutable.abciQuery = async () => {
        throw new Error('abci failed');
      };

      await expect(errorOf(repository.getNativeBalance(RECIPIENT, network))).resolves.toMatchObject({ code: 'NETWORK_ERROR', message: 'abci failed' });
      mutable.abciQuery = async () => ({});
      await expect(errorOf(repository.getNativeBalance(RECIPIENT, network))).resolves.toMatchObject({ code: 'NETWORK_ERROR' });
      await expect(errorOf(new GnoChainRepository(failingFactory).getNativeBalance(RECIPIENT, network))).resolves.toMatchObject({ code: 'NETWORK_ERROR' });
    });
  });

  describe('parseMessages', () => {
    it('delegates to the message parser', () => {
      const { repository } = setup();

      expect(repository.parseMessages([send()], caller)).toEqual([send()]);
      expect(() => repository.parseMessages([send()], RECIPIENT)).toThrow('does not match');
    });
  });

  describe('describeMessages', () => {
    it('summarizes every message type', () => {
      const messages: GnoMessage[] = [
        { type: '/bank.MsgSend', value: { from_address: caller, to_address: RECIPIENT, amount: '1500000ugnot,7foo' } },
        { type: '/vm.m_call', value: { caller, send: '', max_deposit: '', pkg_path: 'gno.land/r/demo/x', func: 'Do', args: ['a', 'b'] } },
        { type: '/vm.m_call', value: { caller, send: '1ugnot', max_deposit: '', pkg_path: 'gno.land/r/demo/x', func: 'Do', args: null } },
        { type: '/vm.m_call', value: { caller, send: '', max_deposit: '', pkg_path: 'gno.land/r/demo/x', func: 'Do', args: [] } },
        { ...addpkg(), value: { ...(addpkg().value as object), send: '100000000000000000000ugnot' } } as GnoMessage,
        { ...run(), value: { ...(run().value as object), package: { name: 'main', path: '', files: [{ name: 'a.gno', body: '' }, { name: 'b.gno', body: '' }] } } } as GnoMessage,
      ];

      expect(setup().repository.describeMessages(messages, network)).toEqual([
        { title: 'Transfer', details: [{ label: 'To', value: RECIPIENT }, { label: 'Amount', value: '1.5 GNOT, 7foo' }] },
        { title: 'Call', details: [{ label: 'Package', value: 'gno.land/r/demo/x' }, { label: 'Function', value: 'Do' }, { label: 'Arguments', value: 'a, b' }, { label: 'Send', value: '0 GNOT' }] },
        { title: 'Call', details: [{ label: 'Package', value: 'gno.land/r/demo/x' }, { label: 'Function', value: 'Do' }, { label: 'Arguments', value: '-' }, { label: 'Send', value: '0.000001 GNOT' }] },
        { title: 'Call', details: [{ label: 'Package', value: 'gno.land/r/demo/x' }, { label: 'Function', value: 'Do' }, { label: 'Arguments', value: '-' }, { label: 'Send', value: '0 GNOT' }] },
        { title: 'Add package', details: [{ label: 'Package', value: 'gno.land/r/demo/x' }, { label: 'Files', value: '1' }, { label: 'Send', value: '100,000,000,000,000 GNOT' }] },
        { title: 'Run', details: [{ label: 'Files', value: 'a.gno, b.gno' }, { label: 'Send', value: '0 GNOT' }] },
      ]);
    });

    it('keeps malformed coins verbatim', () => {
      const [summary] = setup().repository.describeMessages([{ type: '/bank.MsgSend', value: { from_address: caller, to_address: RECIPIENT, amount: 'abc' } }], network);

      expect(summary.details[1].value).toBe('abc');
    });

    it('returns [] for no messages', () => {
      expect(setup().repository.describeMessages([], network)).toEqual([]);
    });
  });

  describe('estimateFee', () => {
    const unlocked = () => ({ publicKey: keyPair.publicKey, withKey: async <T>(task: (key: KeyPair) => Promise<T>) => task(keyPair) });

    it('simulates unsigned txs with the public key and the probe fee', async () => {
      const { repository, state } = setup({ gasUsed: 54_321n });
      const estimate = await repository.estimateFee(draftOf([send()], 'memo'), { publicKey: keyPair.publicKey }, network);

      expect(estimate).toEqual({ gasUsed: String(54_321 + FEE_HEADROOM_GAS), storageDeposit: '0', gasPrice: '0.001', denom: 'ugnot', policy: GNO_FEE_POLICY });
      const [tx] = state.simulated;

      expect(tx.fee).toMatchObject({ gas_wanted: PROBE_GAS_WANTED, gas_fee: '1ugnot' });
      expect(tx.memo).toBe('memo');
      expect(tx.signatures[0].signature).toEqual(new Uint8Array(64));
      expect(PubKeySecp256k1.decode(tx.signatures[0].pub_key!.value).key).toEqual(keyPair.publicKey);
    });

    it('uses the chain gas price and falls back to the policy when it is unavailable', async () => {
      const { repository, mutable } = setup();

      mutable.getGasPrice = async () => ({ amount: 3, gas: 1000, denom: 'ugnot' });
      await expect(repository.estimateFee(draftOf([send()]), { publicKey: keyPair.publicKey }, network)).resolves.toMatchObject({ gasPrice: '0.003' });

      mutable.getGasPrice = async () => {
        throw new Error('not supported');
      };

      await expect(repository.estimateFee(draftOf([send()]), { publicKey: keyPair.publicKey }, network)).resolves.toMatchObject({ gasPrice: '0.001' });

      mutable.getGasPrice = async () => null;
      await expect(repository.estimateFee(draftOf([send()]), { publicKey: keyPair.publicKey }, network)).resolves.toMatchObject({ gasPrice: '0.001' });
    });

    it('honors a custom fee policy', async () => {
      const fake = setup({ maxGas: null });
      const custom = new GnoChainRepository(fake.factory, {
        defaultGasPrice: { amount: 1, gas: 4 },
        simulationGasWanted: '5',
        unboundedSimulationGasWanted: '6',
        txSizeCostPerByte: 0,
      });

      fake.mutable.getGasPrice = async () => null;
      await expect(custom.estimateFee(draftOf([send()]), { publicKey: keyPair.publicKey }, network)).resolves.toMatchObject({ gasPrice: '0.25', gasUsed: '100000' });
      expect(fake.state.simulated[0].fee?.gas_wanted).toBe(5n);
      fake.state.maxGas = '-1';
      await custom.estimateFee(draftOf([send()]), { publicKey: keyPair.publicKey }, network);
      expect(fake.state.simulated[1].fee?.gas_wanted).toBe(6n);
    });

    it('reports the net storage deposit', async () => {
      const { repository } = setup({
        simulate: () => ({
          gas_used: 10n,
          response_base: { events: [storageEvent('/tm.StorageDepositEvent', '900ugnot'), storageEvent('/tm.StorageUnlockEvent', '100ugnot')], data: new Uint8Array(), log: '', info: '' },
        }),
      });

      await expect(repository.estimateFee(draftOf([send()]), { publicKey: keyPair.publicKey }, network)).resolves.toMatchObject({ gasUsed: String(10 + FEE_HEADROOM_GAS), storageDeposit: '800' });
    });

    it('uses the static gas table for code messages while locked', async () => {
      const { repository, state } = setup();
      const locked = { publicKey: keyPair.publicKey };

      await expect(repository.estimateFee(draftOf([run()]), locked, network)).resolves.toMatchObject({ gasUsed: '1000000000', storageDeposit: '0' });
      await expect(repository.estimateFee(draftOf([run('grc20reg x.Transfer(')]), locked, network)).resolves.toMatchObject({ gasUsed: '50000000' });
      await expect(repository.estimateFee(draftOf([addpkg(), send()]), locked, network)).resolves.toMatchObject({ gasUsed: '1000000000' });
      expect(state.simulated).toHaveLength(0);
    });

    it('signs the simulation of code messages when a key is available', async () => {
      const { repository, state } = setup({ gasUsed: 777n });

      await expect(repository.estimateFee(draftOf([run()]), unlocked(), network)).resolves.toMatchObject({ gasUsed: String(777 + FEE_HEADROOM_GAS) });
      const [tx] = state.simulated;

      expect(tx.fee).toMatchObject({ gas_wanted: PROBE_GAS_WANTED, gas_fee: '1ugnot' });
      expect(tx.signatures[0].signature).toHaveLength(64);
      expect(PubKeySecp256k1.decode(tx.signatures[0].pub_key!.value).key).toEqual(keyPair.publicKey);
    });

    it('does not sign plain transfers even when unlocked', async () => {
      const { repository, state } = setup();

      await repository.estimateFee(draftOf([send()]), unlocked(), network);
      // Zeroed placeholder, not a real signature.
      expect(state.simulated[0].signatures[0].signature).toEqual(new Uint8Array(64));
    });

    it('surfaces simulation errors as TRANSACTION_FAILED with the node reason', async () => {
      const { repository } = setup({
        simulate: () => ({
          response_base: { error: Any.create({ type_url: '/vm.VMError', value: new Uint8Array() }), log: 'VM panic: insufficient funds', data: new Uint8Array(), events: [], info: '' },
        }),
      });

      await expect(errorOf(repository.estimateFee(draftOf([send()]), { publicKey: keyPair.publicKey }, network)))
        .resolves.toMatchObject({ code: 'TRANSACTION_FAILED', message: 'insufficient funds' });
    });

    it('passes AppErrors from the key session through', async () => {
      const { repository } = setup();
      const locked = new AppError('WALLET_LOCKED');

      await expect(repository.estimateFee(draftOf([run()]), {
        publicKey: keyPair.publicKey,
        withKey: async () => {
          throw locked;
        },
      }, network)).rejects.toBe(locked);
    });

    it('uses a default message for message-less failures', async () => {
      const { repository } = setup();

      await expect(errorOf(repository.estimateFee(draftOf([run()]), { publicKey: keyPair.publicKey, withKey: () => Promise.reject(undefined) }, network)))
        .resolves.toMatchObject({ code: 'TRANSACTION_FAILED', message: 'Transaction simulation failed' });
    });

    it('wraps provider creation failures as NETWORK_ERROR', async () => {
      await expect(errorOf(new GnoChainRepository(failingFactory).estimateFee(draftOf([send()]), { publicKey: keyPair.publicKey }, network)))
        .resolves.toMatchObject({ code: 'NETWORK_ERROR', message: 'dial failed' });
    });
  });

  describe('signTransaction', () => {
    it('signs with the account number and sequence of the chain', async () => {
      const { repository } = setup();
      const signed = await repository.signTransaction(draftOf([send()], 'memo'), keyPair, network);
      const tx = Tx.decode(fromBase64(signed.encoded));

      expect(tx.memo).toBe('memo');
      expect(tx.fee).toMatchObject({ gas_wanted: 200_000n, gas_fee: '200ugnot' });
      expect(tx.signatures).toHaveLength(1);

      const signBytes = new TextEncoder().encode(JSON.stringify({
        account_number: '7',
        chain_id: network.chainId,
        fee: { amount: [{ amount: '200', denom: 'ugnot' }], gas: '200000' },
        memo: 'memo',
        msgs: [{ '@type': '/bank.MsgSend', amount: '1000ugnot', from_address: caller, to_address: RECIPIENT }],
        sequence: '3',
      }));
      const signature = Secp256k1Signature.fromFixedLength(tx.signatures[0].signature);

      expect(await Secp256k1.verifySignature(signature, sha256(signBytes), keyPair.publicKey)).toBe(true);
    });

    it('reports the signer state, and signs a pinned sequence only while it is the on-chain one', async () => {
      const { repository, state } = setup();

      await expect(repository.signTransaction(draftOf([send()]), keyPair, network)).resolves.toMatchObject({ sequence: '3', accountNumber: '7' });
      await expect(repository.signTransaction(draftOf([send()]), keyPair, network, { sequence: '3', accountNumber: '7' })).resolves.toMatchObject({ sequence: '3' });

      state.sequence = '4';
      await expect(errorOf(repository.signTransaction(draftOf([send()]), keyPair, network, { sequence: '3', accountNumber: '7' })))
        .resolves.toMatchObject({ code: 'PREVIOUS_TRANSACTION_PENDING' });
      await expect(errorOf(repository.signTransaction(draftOf([send()]), keyPair, network, { sequence: '4', accountNumber: '8' })))
        .resolves.toMatchObject({ code: 'PREVIOUS_TRANSACTION_PENDING' });
    });

    it('refuses to sign for a different chain', async () => {
      const { repository } = setup({ chainId: 'other-chain' });

      await expect(errorOf(repository.signTransaction(draftOf([send()]), keyPair, network)))
        .resolves.toMatchObject({ code: 'NETWORK_MISMATCH', message: 'Expected chain test-chain but RPC reports other-chain' });
    });

    it('wraps signing failures as NETWORK_ERROR', async () => {
      const { repository, mutable } = setup();

      mutable.getAccount = async () => {
        throw new Error('account is not initialized');
      };

      await expect(errorOf(repository.signTransaction(draftOf([send()]), keyPair, network)))
        .resolves.toMatchObject({ code: 'NETWORK_ERROR', message: 'account is not initialized' });
      await expect(errorOf(new GnoChainRepository(failingFactory).signTransaction(draftOf([send()]), keyPair, network)))
        .resolves.toMatchObject({ code: 'NETWORK_ERROR' });
    });
  });

  describe('broadcastTransaction', () => {
    it('broadcasts in commit mode and returns hash, height and data', async () => {
      const { repository, state, mutable } = setup();

      await expect(repository.broadcastTransaction({ encoded: 'AAAA' }, network)).resolves.toEqual({ hash: 'HASH', height: '42', data: undefined, committed: true });
      expect(state.broadcasts).toEqual(['AAAA']);

      let endpoint: unknown;

      mutable.sendTransaction = async (_: never, mode: never) => {
        endpoint = mode;
        return { hash: 'H2', height: '9', deliver_tx: { ResponseBase: { Data: 'ZGF0YQ==' } } };
      };

      await expect(repository.broadcastTransaction({ encoded: 'AAAA' }, network)).resolves.toEqual({ hash: 'H2', height: '9', data: 'ZGF0YQ==', committed: true });
      expect(endpoint).toBe('broadcast_tx_commit');
    });

    it('wraps node verdicts (TM2Error) as TRANSACTION_FAILED', async () => {
      const { repository, mutable } = setup();

      mutable.sendTransaction = async () => {
        throw new InsufficientFeeError('fee too low');
      };

      await expect(errorOf(repository.broadcastTransaction({ encoded: 'AAAA' }, network))).resolves.toMatchObject({ code: 'TRANSACTION_FAILED', message: 'insufficient fee' });
      await expect(errorOf(new GnoChainRepository(failingFactory).broadcastTransaction({ encoded: 'AAAA' }, network))).resolves.toMatchObject({ code: 'NETWORK_ERROR' });
    });

    // e.g. broadcast_tx_commit timing out while the tx still commits.
    it('reports transport failures as pending with the tx hash', async () => {
      const { repository, mutable } = setup();
      const hash = toHex(sha256(fromBase64('AAAA'))).toUpperCase();

      mutable.sendTransaction = async () => {
        throw new Error('timed out waiting for tx to be included in a block');
      };

      await expect(errorOf(repository.broadcastTransaction({ encoded: 'AAAA' }, network))).resolves.toMatchObject({ code: 'TRANSACTION_PENDING', hash });
      mutable.sendTransaction = () => Promise.reject(undefined);
      await expect(errorOf(repository.broadcastTransaction({ encoded: 'AAAA' }, network))).resolves.toMatchObject({ code: 'TRANSACTION_PENDING', hash });
    });

    it('reports the same hash before broadcasting as a pending error carries', async () => {
      const { repository, mutable } = setup();
      const signed = await repository.signTransaction(draftOf([send()]), keyPair, network);

      mutable.sendTransaction = async () => {
        throw new Error('timed out');
      };

      const error = await errorOf(repository.broadcastTransaction(signed, network));

      expect(repository.transactionHash(signed)).toMatch(/^[0-9A-F]{64}$/);
      expect(error).toMatchObject({ code: 'TRANSACTION_PENDING', hash: repository.transactionHash(signed) });
    });
  });

  describe('getTransactionStatus', () => {
    it('reads the committed result and treats lookup failures as pending', async () => {
      const { repository, mutable } = setup();
      let asked: unknown;

      mutable.getTransaction = async (hash: never) => {
        asked = hash;
        return { tx_result: { ResponseBase: { Error: null } } };
      };

      await expect(repository.getTransactionStatus('ABCD', network)).resolves.toBe('committed');
      expect(asked).toBe('ABCD');
      mutable.getTransaction = async () => ({ tx_result: { ResponseBase: { Error: { '@type': '/std.OutOfGasError' } } } });
      await expect(repository.getTransactionStatus('ABCD', network)).resolves.toBe('failed');
      mutable.getTransaction = async () => {
        throw new Error('tx not found');
      };

      await expect(repository.getTransactionStatus('ABCD', network)).resolves.toBe('pending');
      await expect(new GnoChainRepository(failingFactory).getTransactionStatus('ABCD', network)).resolves.toBe('pending');
    });
  });

  describe('findTransaction', () => {
    it('reports a hash the node does not know as null and throws on any other failure', async () => {
      const { repository, state, mutable } = setup();

      state.transactions.ABCD = 'committed';
      await expect(repository.findTransaction('ABCD', network)).resolves.toBe('committed');
      state.transactions.ABCD = 'failed';
      await expect(repository.findTransaction('ABCD', network)).resolves.toBe('failed');
      await expect(repository.findTransaction('EEEE', network)).resolves.toBeNull();

      mutable.getTransaction = async () => {
        throw new Error('socket hang up');
      };

      await expect(errorOf(repository.findTransaction('ABCD', network))).resolves.toMatchObject({ code: 'NETWORK_ERROR' });
      await expect(errorOf(new GnoChainRepository(failingFactory).findTransaction('ABCD', network))).resolves.toMatchObject({ code: 'NETWORK_ERROR' });
      expect(txNotFoundError('X').message).toContain('Could not find tx result for hash');
    });
  });

  describe('getAccountSequence', () => {
    it('reads the on-chain sequence and throws when it cannot', async () => {
      const { repository, state, mutable } = setup();

      state.sequence = '12';
      await expect(repository.getAccountSequence(caller, network)).resolves.toBe('12');

      mutable.getAccount = async () => ({ BaseAccount: { sequence: 'x' } });
      await expect(errorOf(repository.getAccountSequence(caller, network))).resolves.toMatchObject({ code: 'NETWORK_ERROR' });
      mutable.getAccount = async () => {
        throw new Error('timeout');
      };

      await expect(errorOf(repository.getAccountSequence(caller, network))).resolves.toMatchObject({ code: 'NETWORK_ERROR' });
    });
  });
});
