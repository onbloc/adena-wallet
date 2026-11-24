import { fromBase64, toHex } from '@cosmjs/encoding';
import { Tx } from '@gnolang/tm2-js-client';
import { documentToTx, HDWalletKeyring, publicKeyToAddress } from 'adena-module';

import { isAppError } from '../src/core/errors';
import { deriveKeyPair, KeyPair } from '../src/crypto/key-pair';
import { mnemonicToSeed } from '../src/crypto/mnemonic';
import { GnoChainRepository } from '../src/repositories/chain/gno/gno-chain.repository';
import { GnoMessage } from '../src/repositories/chain/gno/gno-messages';
import { buildUnsignedGnoTx } from '../src/repositories/chain/gno/gno-tx-encoder';
import { BUILT_IN_NETWORKS } from '../src/resources';
import { createFakeGnoProvider } from './helpers/fake-gno-provider';
import { TEST_MNEMONIC } from './helpers/test-container';

const network = { ...BUILT_IN_NETWORKS[0], chainId: 'test-chain' };
const RECIPIENT = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';

const keyPairOf = async (index = 0): Promise<KeyPair> => deriveKeyPair(await mnemonicToSeed(TEST_MNEMONIC), index);

const sampleMessages = (caller: string): GnoMessage[] => [
  { type: '/bank.MsgSend', value: { from_address: caller, to_address: RECIPIENT, amount: '1000ugnot' } },
  {
    type: '/vm.m_call',
    value: { caller, send: '', max_deposit: '', pkg_path: 'gno.land/r/demo/counter', func: 'Increment', args: ['1'] },
  },
  {
    type: '/vm.m_run',
    value: {
      caller,
      send: '5ugnot',
      max_deposit: '',
      package: { name: 'main', path: '', files: [{ name: 'main.gno', body: 'package main\nfunc main() {}' }] },
    },
  },
];

describe('GnoChainRepository', () => {
  it('derives the same address as adena-module', async () => {
    const { factory } = createFakeGnoProvider();
    const repository = new GnoChainRepository(factory);

    for (const index of [0, 1, 5]) {
      const { publicKey } = await keyPairOf(index);

      expect(repository.deriveAddress(publicKey, network)).toBe(await publicKeyToAddress(publicKey, 'g'));
    }
  });

  it('encodes messages byte-for-byte like adena-module documentToTx', async () => {
    const { publicKey } = await keyPairOf();
    const caller = await publicKeyToAddress(publicKey, 'g');
    const messages = sampleMessages(caller);
    const fee = { gasWanted: '200000', gasFee: '200ugnot' };

    const mobile = Tx.encode(buildUnsignedGnoTx(messages, fee, 'memo')).finish();
    const reference = Tx.encode(documentToTx({
      chain_id: network.chainId,
      account_number: '7',
      sequence: '3',
      fee: { amount: [{ amount: '200', denom: 'ugnot' }], gas: '200000' },
      msgs: messages,
      memo: 'memo',
    })).finish();

    expect(toHex(mobile)).toBe(toHex(reference));
  });

  it('produces the same signature as the extension keyring', async () => {
    const { factory, provider } = createFakeGnoProvider({ chainId: network.chainId });
    const repository = new GnoChainRepository(factory);
    const keyPair = await keyPairOf();
    const caller = repository.deriveAddress(keyPair.publicKey, network);
    const messages = sampleMessages(caller);
    const fee = { gasWanted: '200000', gasFee: '200ugnot' };

    const signed = await repository.signTransaction(
      { networkId: network.id, chainId: network.chainId, messages, fee, memo: '' },
      keyPair,
      network,
    );
    const keyring = await HDWalletKeyring.fromMnemonic(TEST_MNEMONIC);
    const reference = await keyring.sign(provider, {
      chain_id: network.chainId,
      account_number: '7',
      sequence: '3',
      fee: { amount: [{ amount: '200', denom: 'ugnot' }], gas: '200000' },
      msgs: messages,
      memo: '',
    });
    const mobileTx = Tx.decode(fromBase64(signed.encoded));

    expect(toHex(mobileTx.signatures[0].signature)).toBe(toHex(reference.signature[0].signature));
  });

  it('reads the native balance as an exact integer string', async () => {
    const { factory } = createFakeGnoProvider({ balances: { [RECIPIENT]: '9007199254740993ugnot,5foo' } });
    const balance = await new GnoChainRepository(factory).getNativeBalance(RECIPIENT, network);

    expect(balance).toMatchObject({ amount: '9007199254740993', denom: 'ugnot', symbol: 'GNOT' });
  });

  describe('parseMessages', () => {
    const repository = new GnoChainRepository(createFakeGnoProvider().factory);

    it('accepts well-formed messages for the signer', () => {
      const parsed = repository.parseMessages(
        [{ type: '/vm.m_call', value: { caller: RECIPIENT, pkg_path: 'gno.land/r/demo/x', func: 'Do' } }],
        RECIPIENT,
      );

      expect(parsed[0]).toEqual({
        type: '/vm.m_call',
        value: { caller: RECIPIENT, send: '', max_deposit: '', pkg_path: 'gno.land/r/demo/x', func: 'Do', args: null },
      });
    });

    it('rejects messages signed for another account', () => {
      const error = ((): unknown => {
        try {
          repository.parseMessages([{ type: '/bank.MsgSend', value: { from_address: 'g1other', to_address: RECIPIENT, amount: '1ugnot' } }], RECIPIENT);
        }
        catch (caught) {
          return caught;
        }
      })();

      expect(isAppError(error, 'INVALID_REQUEST')).toBe(true);
    });

    it('rejects authority-granting message types', () => {
      expect(() => repository.parseMessages([{ type: '/auth.m_create_session', value: { creator: RECIPIENT } }], RECIPIENT))
        .toThrow('Unsupported message type');
    });

    it('rejects malformed coin amounts', () => {
      expect(() => repository.parseMessages(
        [{ type: '/vm.m_call', value: { caller: RECIPIENT, pkg_path: 'p', func: 'f', send: '1.5ugnot' } }],
        RECIPIENT,
      )).toThrow('coin list');
    });

    // tm2 std.ParseCoin allows spaces between amount and denom; the parser re-emits the canonical form.
    it('normalizes spaced coin amounts', () => {
      const [message] = repository.parseMessages([{ type: '/vm.m_call', value: { caller: RECIPIENT, pkg_path: 'p', func: 'f', send: '10 gnot' } }], RECIPIENT);

      expect((message.value as { send: string }).send).toBe('10gnot');
    });
  });
});
