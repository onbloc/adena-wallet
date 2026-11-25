import { Secp256k1, Secp256k1Signature, sha256 } from '@cosmjs/crypto';
import { fromBase64, toBase64, toHex } from '@cosmjs/encoding';
import { SignMode } from 'cosmjs-types/cosmos/tx/signing/v1beta1/signing';
import { AuthInfo, TxBody, TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx';

import { AppError } from '../../../../../src/core/errors';
import { deriveKeyPair, KeyPair } from '../../../../../src/crypto/key-pair';
import { mnemonicToSeed } from '../../../../../src/crypto/mnemonic';
import { COSMOS_FEE_POLICY } from '../../../../../src/domain/fee';
import { CosmosLcdClient } from '../../../../../src/infrastructure/http/cosmos-lcd.client';
import { HttpRequest, HttpStatusError } from '../../../../../src/infrastructure/http/http-client';
import { CosmosChainRepository } from '../../../../../src/repositories/chain/cosmos/cosmos-chain.repository';
import { CosmosMessage } from '../../../../../src/repositories/chain/cosmos/cosmos-messages';
import { encodeAuthInfo, encodeSignDoc, encodeTxBody } from '../../../../../src/repositories/chain/cosmos/cosmos-tx-encoder';
import { BUILT_IN_NETWORKS } from '../../../../../src/resources';
import { FakeHttpClient } from '../../../../helpers/fake-http';
import { TEST_MNEMONIC } from '../../../../helpers/test-container';

const network = BUILT_IN_NETWORKS.find(item => item.id === 'atomone-1')!;
const REST = network.restUrl!;
const RECIPIENT = 'atone1qyqszqgpqyqszqgpqyqszqgpqyqszqgpjnp7du';

let keyPair: KeyPair;
let address: string;

beforeAll(async () => {
  keyPair = await deriveKeyPair(await mnemonicToSeed(TEST_MNEMONIC), 0);
  address = new CosmosChainRepository(new CosmosLcdClient(new FakeHttpClient())).deriveAddress(keyPair.publicKey, network);
});

const urls = () => ({
  nodeInfo: `${REST}/cosmos/base/tendermint/v1beta1/node_info`,
  account: `${REST}/cosmos/auth/v1beta1/accounts/${address}`,
  balances: `${REST}/cosmos/bank/v1beta1/balances/${address}`,
  config: `${REST}/cosmos/base/node/v1beta1/config`,
  simulate: `${REST}/cosmos/tx/v1beta1/simulate`,
  txs: `${REST}/cosmos/tx/v1beta1/txs`,
});

const setup = () => {
  const http = new FakeHttpClient();

  return { http, repository: new CosmosChainRepository(new CosmosLcdClient(http)) };
};

// What the LCD returns for a never-funded account: HTTP 404 with gRPC NotFound.
const unknownAccount = (http: FakeHttpClient): FakeHttpClient => http.on(urls().account, () => {
  throw new HttpStatusError(404, { code: 5, message: `rpc error: code = NotFound desc = account ${address} not found`, details: [] });
});

const errorOf = async (promise: Promise<unknown>): Promise<AppError> => promise.then(
  () => {
    throw new Error('expected rejection');
  },
  (error: AppError) => error,
);

const send = (amount = [{ denom: 'uatone', amount: '1000000' }]): CosmosMessage => ({
  type: 'cosmos-sdk/MsgSend',
  value: { from_address: address, to_address: RECIPIENT, amount },
});
const draftOf = (messages: CosmosMessage[], fee = { gasWanted: '104000', gasFee: '28080uphoton' }) =>
  ({ networkId: network.id, chainId: 'atomone-1', messages, memo: 'hi', fee });

describe('CosmosChainRepository', () => {
  it('derives and validates atone addresses', () => {
    const { repository } = setup();

    expect(repository.family).toBe('cosmos');
    expect(address.startsWith('atone1')).toBe(true);
    expect(repository.isValidAddress(address, network)).toBe(true);
    expect(repository.isValidAddress('g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5', network)).toBe(false);
    expect(repository.isValidAddress('atone1invalid', network)).toBe(false);
  });

  describe('getChainId', () => {
    it('reads the node chain id', async () => {
      const { repository, http } = setup();

      http.on(urls().nodeInfo, { default_node_info: { network: 'atomone-1' } });
      await expect(repository.getChainId(network)).resolves.toBe('atomone-1');
    });

    it('maps failures to NETWORK_ERROR', async () => {
      const { repository, http } = setup();

      await expect(errorOf(repository.getChainId(network))).resolves.toMatchObject({ code: 'NETWORK_ERROR', message: `404 ${urls().nodeInfo}` });
      http.on(urls().nodeInfo, {});
      await expect(errorOf(repository.getChainId(network))).resolves.toMatchObject({ code: 'NETWORK_ERROR', message: 'Node did not report a chain id' });
    });

    it('fails without a REST endpoint', async () => {
      await expect(async () => setup().repository.getChainId({ ...network, restUrl: undefined })).rejects.toThrow('Mainnet has no REST endpoint');
    });

    // restUrlOf runs before the promise exists, so callers using `.catch()` see a synchronous throw.
    it.todo('rejects (instead of throwing synchronously) without a REST endpoint');
  });

  describe('getNativeBalance', () => {
    it('returns the native denom balance or 0', async () => {
      const { repository, http } = setup();

      http.on(urls().balances, { balances: [{ denom: 'uphoton', amount: '5' }, { denom: 'uatone', amount: '42' }] });
      await expect(repository.getNativeBalance(address, network)).resolves.toEqual({ denom: 'uatone', symbol: 'ATONE', decimals: 6, amount: '42' });
      http.on(urls().balances, { balances: [] });
      await expect(repository.getNativeBalance(address, network)).resolves.toMatchObject({ amount: '0' });
    });

    it('maps failures to NETWORK_ERROR', async () => {
      await expect(errorOf(setup().repository.getNativeBalance(address, network))).resolves.toMatchObject({ code: 'NETWORK_ERROR' });
      await expect(errorOf(setup().repository.getNativeBalance(address, { ...network, restUrl: undefined }))).resolves.toMatchObject({ code: 'NETWORK_ERROR' });
    });

    it('wraps non-Error rejections', async () => {
      const http = new FakeHttpClient();

      http.request = () => Promise.reject('boom');
      await expect(errorOf(new CosmosChainRepository(new CosmosLcdClient(http)).getNativeBalance(address, network))).resolves.toMatchObject({ code: 'NETWORK_ERROR', message: 'NETWORK_ERROR' });
    });
  });

  it('refuses dApp messages', () => {
    expect(() => setup().repository.parseMessages()).toThrow(expect.objectContaining({ code: 'UNSUPPORTED_MESSAGE' }));
  });

  it('describes transfers with token metadata and raw unknown denoms', () => {
    const summaries = setup().repository.describeMessages([
      send([{ denom: 'uatone', amount: '1500000' }, { denom: 'uphoton', amount: '1' }, { denom: 'ibc/ABC', amount: '7' }]),
      send([]),
    ], network);

    expect(summaries).toEqual([
      { title: 'Transfer', details: [{ label: 'To', value: RECIPIENT }, { label: 'Amount', value: '1.5 ATONE, 0.000001 PHOTON, 7ibc/ABC' }] },
      { title: 'Transfer', details: [{ label: 'To', value: RECIPIENT }, { label: 'Amount', value: '' }] },
    ]);
  });

  describe('estimateFee', () => {
    const signer = () => ({ publicKey: keyPair.publicKey });

    it('simulates with a zero signature and placeholder fee, priced from the node', async () => {
      const { repository, http } = setup();
      let simulated: HttpRequest | undefined;

      http
        .on(urls().account, { account: { '@type': '/cosmos.auth.v1beta1.BaseAccount', address, account_number: '12', sequence: '4' } })
        .on(urls().simulate, (init?: HttpRequest) => {
          simulated = init;
          return { gas_info: { gas_used: '80000' } };
        })
        .on(urls().config, { minimum_gas_price: '0.0225uatone,0.5uphoton' });

      await expect(repository.estimateFee(draftOf([send()]), signer(), network)).resolves.toEqual({ gasUsed: '80000', gasPrice: '0.5', denom: 'uphoton', policy: COSMOS_FEE_POLICY });

      const raw = TxRaw.decode(fromBase64((simulated?.body as { tx_bytes: string }).tx_bytes));
      const authInfo = AuthInfo.decode(raw.authInfoBytes);

      expect(simulated?.method).toBe('POST');
      expect(raw.signatures).toEqual([new Uint8Array(64)]);
      expect(TxBody.decode(raw.bodyBytes).memo).toBe('hi');
      expect(authInfo.signerInfos[0]).toMatchObject({ sequence: 4n, modeInfo: { single: { mode: SignMode.SIGN_MODE_DIRECT } } });
      expect(authInfo.fee).toMatchObject({ amount: [{ denom: 'uphoton', amount: '0' }], gasLimit: 200000n });
    });

    it('starts unknown accounts at sequence 0 and falls back to the network gas price', async () => {
      const { repository, http } = setup();
      let sequence: bigint | undefined;

      unknownAccount(http)
        .on(urls().simulate, (init?: HttpRequest) => {
          const raw = TxRaw.decode(fromBase64((init?.body as { tx_bytes: string }).tx_bytes));

          sequence = AuthInfo.decode(raw.authInfoBytes).signerInfos[0].sequence;
          return { gas_info: { gas_used: '1' } };
        })
        .on(urls().config, { minimum_gas_price: '0.0225uatone' });

      await expect(repository.estimateFee(draftOf([send()]), signer(), network)).resolves.toMatchObject({ gasUsed: '1', gasPrice: '0.225' });
      expect(sequence).toBe(0n);
    });

    it('falls back when the config query fails', async () => {
      const { repository, http } = setup();

      unknownAccount(http).on(urls().simulate, { gas_info: { gas_used: '10' } });
      await expect(repository.estimateFee(draftOf([send()]), signer(), network)).resolves.toMatchObject({ gasPrice: '0.225' });
    });

    it('fails without any gas price', async () => {
      const { repository, http } = setup();

      unknownAccount(http).on(urls().simulate, { gas_info: { gas_used: '10' } });
      await expect(errorOf(repository.estimateFee(draftOf([send()]), signer(), { ...network, fallbackGasPrice: undefined })))
        .resolves.toMatchObject({ code: 'NETWORK_ERROR', message: 'No minimum gas price for uphoton' });
    });

    it('maps simulation failures to TRANSACTION_FAILED', async () => {
      const { repository, http } = setup();

      unknownAccount(http);
      await expect(errorOf(repository.estimateFee(draftOf([send()]), signer(), network))).resolves.toMatchObject({ code: 'TRANSACTION_FAILED', message: `404 ${urls().simulate}` });
      http.on(urls().simulate, { gas_info: { gas_used: '0' } });
      await expect(errorOf(repository.estimateFee(draftOf([send()]), signer(), network))).resolves.toMatchObject({ code: 'TRANSACTION_FAILED', message: 'Simulation returned no gas usage' });
      http.on(urls().simulate, () => {
        throw undefined;
      });
      await expect(errorOf(repository.estimateFee(draftOf([send()]), signer(), network))).resolves.toMatchObject({ message: 'Transaction simulation failed' });
    });

    it('propagates account lookup failures instead of assuming a new account', async () => {
      const { repository, http } = setup();

      http.on(urls().account, () => {
        throw new HttpStatusError(503, null);
      });
      http.on(urls().simulate, { gas_info: { gas_used: '10' } });
      await expect(errorOf(repository.estimateFee(draftOf([send()]), signer(), network))).resolves.toMatchObject({ code: 'NETWORK_ERROR', message: 'Request failed with status 503' });
    });

    it('requires a REST endpoint', async () => {
      await expect(errorOf(setup().repository.estimateFee(draftOf([send()]), signer(), { ...network, restUrl: undefined }))).resolves.toMatchObject({ code: 'NETWORK_ERROR' });
    });
  });

  describe('signTransaction', () => {
    const withChain = (chainId = 'atomone-1') => {
      const env = setup();

      env.http.on(urls().nodeInfo, { default_node_info: { network: chainId } });
      return env;
    };

    it('signs SIGN_MODE_DIRECT with the account number and sequence', async () => {
      const { repository, http } = withChain();

      http.on(urls().account, { account: { '@type': '/cosmos.auth.v1beta1.ModuleAccount', base_account: { address, account_number: '12', sequence: '4' } } });
      const signed = await repository.signTransaction(draftOf([send()]), keyPair, network);
      const raw = TxRaw.decode(fromBase64(signed.encoded));
      const fee = { amount: [{ amount: '28080', denom: 'uphoton' }], gas: '104000' };

      expect(toHex(raw.bodyBytes)).toBe(toHex(encodeTxBody([send()], 'hi')));
      expect(toHex(raw.authInfoBytes)).toBe(toHex(encodeAuthInfo(keyPair.publicKey, '4', fee)));
      expect(raw.signatures[0]).toHaveLength(64);

      const signBytes = encodeSignDoc(raw.bodyBytes, raw.authInfoBytes, 'atomone-1', '12');

      expect(await Secp256k1.verifySignature(Secp256k1Signature.fromFixedLength(raw.signatures[0]), sha256(signBytes), keyPair.publicKey)).toBe(true);
    });

    it('reports the signer state and signs a pinned sequence only while it is the on-chain one', async () => {
      const { repository, http } = withChain();

      http.on(urls().account, { account: { '@type': '/cosmos.auth.v1beta1.BaseAccount', address, account_number: '12', sequence: '4' } });
      await expect(repository.signTransaction(draftOf([send()]), keyPair, network)).resolves.toMatchObject({ sequence: '4', accountNumber: '12' });
      await expect(repository.signTransaction(draftOf([send()]), keyPair, network, { sequence: '4', accountNumber: '12' })).resolves.toMatchObject({ sequence: '4' });
      await expect(errorOf(repository.signTransaction(draftOf([send()]), keyPair, network, { sequence: '3', accountNumber: '12' })))
        .resolves.toMatchObject({ code: 'PREVIOUS_TRANSACTION_PENDING' });
    });

    it('uses 0/0 for unknown accounts and an empty fee for malformed gas fees', async () => {
      const { repository, http } = withChain();

      unknownAccount(http);
      const signed = await repository.signTransaction(draftOf([send()], { gasWanted: '1', gasFee: 'bad' }), keyPair, network);
      const authInfo = AuthInfo.decode(TxRaw.decode(fromBase64(signed.encoded)).authInfoBytes);

      expect(authInfo.signerInfos[0].sequence).toBe(0n);
      expect(authInfo.fee).toMatchObject({ amount: [], gasLimit: 1n });
    });

    it('refuses a chain mismatch', async () => {
      await expect(errorOf(withChain('atomone-testnet-1').repository.signTransaction(draftOf([send()]), keyPair, network)))
        .resolves.toMatchObject({ code: 'NETWORK_MISMATCH', message: 'Expected chain atomone-1 but the node reports atomone-testnet-1' });
    });

    it('refuses non-transfer messages', async () => {
      const message = { type: 'cosmos-sdk/MsgDelegate', value: {} } as unknown as CosmosMessage;

      await expect(errorOf(withChain().repository.signTransaction(draftOf([send(), message]), keyPair, network)))
        .resolves.toMatchObject({ code: 'UNSUPPORTED_MESSAGE' });
    });

    it('propagates chain id failures', async () => {
      await expect(errorOf(setup().repository.signTransaction(draftOf([send()]), keyPair, network))).resolves.toMatchObject({ code: 'NETWORK_ERROR' });
    });
  });

  describe('broadcastTransaction', () => {
    const encoded = toBase64(new Uint8Array([1, 2, 3]));

    it('broadcasts in sync mode', async () => {
      const { repository, http } = setup();
      let body: unknown;

      http.on(urls().txs, (init?: HttpRequest) => {
        body = init?.body;
        return { tx_response: { txhash: 'ABC', code: 0, raw_log: '', height: '0' } };
      });
      await expect(repository.broadcastTransaction({ encoded }, network)).resolves.toEqual({ hash: 'ABC', height: '0', committed: false });
      expect(body).toEqual({ tx_bytes: encoded, mode: 'BROADCAST_MODE_SYNC' });
    });

    it('computes the hash when the node omits it', async () => {
      const { repository, http } = setup();

      http.on(urls().txs, { tx_response: { txhash: '', code: 0, raw_log: '', height: '5' } });
      await expect(repository.broadcastTransaction({ encoded }, network)).resolves.toEqual({ hash: toHex(sha256(new Uint8Array([1, 2, 3]))).toUpperCase(), height: '5', committed: false });
    });

    it('rejects definitively on a CheckTx code or a client error', async () => {
      const { repository, http } = setup();

      http.on(urls().txs, { tx_response: { txhash: 'X', code: 5, raw_log: 'insufficient funds', height: '0' } });
      await expect(errorOf(repository.broadcastTransaction({ encoded }, network))).resolves.toMatchObject({ code: 'TRANSACTION_FAILED', message: 'Broadcast failed (code 5): insufficient funds' });
      http.on(urls().txs, () => {
        throw new HttpStatusError(400, null, 'bad tx');
      });
      await expect(errorOf(repository.broadcastTransaction({ encoded }, network))).resolves.toMatchObject({ code: 'NETWORK_ERROR', message: 'bad tx' });
      await expect(errorOf(repository.broadcastTransaction({ encoded }, { ...network, restUrl: undefined }))).resolves.toMatchObject({ code: 'NETWORK_ERROR' });
    });

    it('reports an unknown outcome as pending with the computed hash', async () => {
      const { repository, http } = setup();
      const hash = toHex(sha256(new Uint8Array([1, 2, 3]))).toUpperCase();
      const pending = { code: 'TRANSACTION_PENDING', hash };

      http.on(urls().txs, () => {
        throw new Error('socket hang up');
      });
      await expect(errorOf(repository.broadcastTransaction({ encoded }, network))).resolves.toMatchObject(pending);
      http.on(urls().txs, () => {
        throw new HttpStatusError(504);
      });
      await expect(errorOf(repository.broadcastTransaction({ encoded }, network))).resolves.toMatchObject(pending);
      http.on(urls().txs, {});
      await expect(errorOf(repository.broadcastTransaction({ encoded }, network))).resolves.toMatchObject(pending);
      // Code 19: already in the mempool.
      http.on(urls().txs, { tx_response: { txhash: 'X', code: 19, raw_log: 'tx already in mempool', height: '0' } });
      await expect(errorOf(repository.broadcastTransaction({ encoded }, network))).resolves.toMatchObject(pending);
    });

    it('reports the same hash before broadcasting as a pending error carries', async () => {
      const { repository, http } = setup();

      http.on(urls().txs, () => {
        throw new Error('socket hang up');
      });

      expect(repository.transactionHash({ encoded })).toBe(toHex(sha256(new Uint8Array([1, 2, 3]))).toUpperCase());
      await expect(errorOf(repository.broadcastTransaction({ encoded }, network))).resolves.toMatchObject({ hash: repository.transactionHash({ encoded }) });
    });
  });

  describe('getTransactionStatus', () => {
    it('maps the indexed tx code and treats not found or failures as pending', async () => {
      const { repository, http } = setup();
      const url = `${REST}/cosmos/tx/v1beta1/txs/ABC`;

      await expect(repository.getTransactionStatus('ABC', network)).resolves.toBe('pending');
      http.on(url, { tx_response: { code: 0 } });
      await expect(repository.getTransactionStatus('ABC', network)).resolves.toBe('committed');
      http.on(url, { tx_response: { code: 11 } });
      await expect(repository.getTransactionStatus('ABC', network)).resolves.toBe('failed');
      http.on(url, () => {
        throw new HttpStatusError(503);
      });
      await expect(repository.getTransactionStatus('ABC', network)).resolves.toBe('pending');
    });
  });

  describe('findTransaction', () => {
    it('reports a 404 as null and throws on any other failure', async () => {
      const { repository, http } = setup();
      const url = `${REST}/cosmos/tx/v1beta1/txs/ABC`;

      http.on(url, () => {
        throw new HttpStatusError(404);
      });
      await expect(repository.findTransaction('ABC', network)).resolves.toBeNull();
      http.on(url, { tx_response: { code: 0 } });
      await expect(repository.findTransaction('ABC', network)).resolves.toBe('committed');
      http.on(url, { tx_response: { code: 5 } });
      await expect(repository.findTransaction('ABC', network)).resolves.toBe('failed');
      http.on(url, () => {
        throw new HttpStatusError(503);
      });
      await expect(errorOf(repository.findTransaction('ABC', network))).resolves.toMatchObject({ code: 'NETWORK_ERROR' });
    });
  });

  describe('getAccountSequence', () => {
    it('reads the LCD account sequence, 0 for an unknown account, and throws on failures', async () => {
      const { repository, http } = setup();

      http.on(urls().account, { account: { '@type': '/cosmos.auth.v1beta1.BaseAccount', address, account_number: '12', sequence: '9' } });
      await expect(repository.getAccountSequence(address, network)).resolves.toBe('9');
      unknownAccount(http);
      await expect(repository.getAccountSequence(address, network)).resolves.toBe('0');
      http.on(urls().account, () => {
        throw new HttpStatusError(503);
      });
      await expect(errorOf(repository.getAccountSequence(address, network))).resolves.toMatchObject({ code: 'NETWORK_ERROR' });
    });
  });
});
