import type { StdSignDoc } from '@cosmjs/amino';
import type { SignDoc } from 'cosmjs-types/cosmos/tx/v1beta1/tx';

// Stub out `@adena-wallet/sdk` to avoid pulling in @web3auth's native crypto at
// import time — jsdom's globals fail noble-hashes' Uint8Array instance check.
// The cosmos executor methods build their request messages directly and do
// not consume SDK enum values at runtime.
jest.mock('@adena-wallet/sdk', () => ({
  WalletResponseExecuteType: {},
  WalletResponseFailureType: {},
  WalletResponseStatus: { SUCCESS: 'success', FAILURE: 'failure' },
  WalletMessageInfo: {},
}));

import {
  deserializeSignDoc,
  deserializeTxBytes,
} from '@common/utils/cosmos-serialize';

import { AdenaExecutor } from './executor';

interface CapturedMessage {
  type: string;
  status: string;
  data: { [key: string]: unknown };
  key?: string;
}

function mockOrigin(): string {
  return window.location.origin;
}

// Installs a postMessage spy that captures the most recent outbound message
// and gives the test a way to dispatch a response back to the executor.
function setupPostMessageSpy(): {
  getLast: () => CapturedMessage;
  respondSuccess: (data: unknown) => void;
  respondFailure: (message: string) => void;
  restore: () => void;
} {
  const captured: CapturedMessage[] = [];
  const originalPostMessage = window.postMessage.bind(window);
  const spy = jest
    .spyOn(window, 'postMessage')
    .mockImplementation((message: unknown) => {
      captured.push(message as CapturedMessage);
    });

  const respond = (status: 'success' | 'failure', extra: Record<string, unknown>): void => {
    const last = captured[captured.length - 1];
    const event = new MessageEvent('message', {
      data: {
        ...last,
        status,
        ...extra,
      },
      origin: mockOrigin(),
    });
    window.dispatchEvent(event);
  };

  return {
    getLast: () => captured[captured.length - 1],
    respondSuccess: (data) => respond('success', { data, code: 0, message: 'OK' }),
    respondFailure: (message) => respond('failure', { data: undefined, code: 1, message }),
    restore: (): void => {
      spy.mockRestore();
      window.postMessage = originalPostMessage;
    },
  };
}

describe('AdenaExecutor — Cosmos methods', () => {
  let spy: ReturnType<typeof setupPostMessageSpy>;

  beforeEach(() => {
    spy = setupPostMessageSpy();
  });

  afterEach(() => {
    spy.restore();
  });

  describe('enableCosmos', () => {
    it('posts an ENABLE_COSMOS request with chainIds payload', async () => {
      const executor = new AdenaExecutor();
      const promise = executor.enableCosmos(['atomone-1', 'atomone-testnet-1']);

      const last = spy.getLast();
      expect(last.type).toBe('ENABLE_COSMOS');
      expect(last.status).toBe('request');
      expect(last.data).toEqual({ chainIds: ['atomone-1', 'atomone-testnet-1'] });
      expect(last.key).toBeDefined();

      spy.respondSuccess(undefined);
      const response = await promise;
      expect(response.status).toBe('success');
    });

    it('propagates a failure response', async () => {
      const executor = new AdenaExecutor();
      const promise = executor.enableCosmos('atomone-1');
      spy.respondFailure('REJECTED');
      const response = await promise;
      expect(response.status).toBe('failure');
      expect(response.message).toBe('REJECTED');
    });
  });

  describe('getCosmosKey', () => {
    it('posts a GET_COSMOS_KEY request with chainId', async () => {
      const executor = new AdenaExecutor();
      const promise = executor.getCosmosKey('atomone-1');

      const last = spy.getLast();
      expect(last.type).toBe('GET_COSMOS_KEY');
      expect(last.data).toEqual({ chainId: 'atomone-1' });

      spy.respondSuccess({ bech32Address: 'atone1…' });
      const response = await promise;
      expect(response.status).toBe('success');
    });
  });

  describe('signCosmosAmino', () => {
    it('posts a SIGN_COSMOS_AMINO request with pass-through StdSignDoc', async () => {
      const executor = new AdenaExecutor();
      const signDoc: StdSignDoc = {
        chain_id: 'atomone-1',
        account_number: '1',
        sequence: '0',
        fee: { amount: [{ denom: 'uatone', amount: '1000' }], gas: '200000' },
        msgs: [],
        memo: '',
      };

      const promise = executor.signCosmosAmino('atomone-1', 'atone1…', signDoc);
      const last = spy.getLast();
      expect(last.type).toBe('SIGN_COSMOS_AMINO');
      expect(last.data).toEqual({
        chainId: 'atomone-1',
        signer: 'atone1…',
        signDoc,
      });

      spy.respondSuccess({ signed: signDoc, signature: {} });
      await expect(promise).resolves.toMatchObject({ status: 'success' });
    });
  });

  describe('signCosmosDirect', () => {
    it('serializes SignDoc bigint + Uint8Array fields before posting', async () => {
      const executor = new AdenaExecutor();
      const signDoc: SignDoc = {
        bodyBytes: new Uint8Array([1, 2, 3]),
        authInfoBytes: new Uint8Array([4, 5, 6]),
        chainId: 'atomone-1',
        accountNumber: BigInt(42),
      };

      const promise = executor.signCosmosDirect('atomone-1', 'atone1…', signDoc);
      const last = spy.getLast();
      expect(last.type).toBe('SIGN_COSMOS_DIRECT');
      expect(last.data.chainId).toBe('atomone-1');
      expect(last.data.signer).toBe('atone1…');

      const serialized = last.data.signDoc as {
        bodyBytes: string;
        authInfoBytes: string;
        chainId: string;
        accountNumber: string;
      };
      expect(typeof serialized.accountNumber).toBe('string');
      expect(serialized.accountNumber).toBe('42');

      const rebuilt = deserializeSignDoc(serialized);
      expect(rebuilt.accountNumber).toBe(signDoc.accountNumber);
      expect(Array.from(rebuilt.bodyBytes)).toEqual(Array.from(signDoc.bodyBytes));
      expect(Array.from(rebuilt.authInfoBytes)).toEqual(Array.from(signDoc.authInfoBytes));

      spy.respondSuccess({ signed: serialized, signature: {} });
      await promise;
    });
  });

  describe('sendCosmosTx', () => {
    it('base64-encodes tx bytes before posting', async () => {
      const executor = new AdenaExecutor();
      const tx = new Uint8Array([1, 2, 3, 255]);

      const promise = executor.sendCosmosTx('atomone-1', tx, 'sync');
      const last = spy.getLast();
      expect(last.type).toBe('SEND_COSMOS_TX');
      expect(last.data.chainId).toBe('atomone-1');
      expect(last.data.mode).toBe('sync');
      expect(typeof last.data.tx).toBe('string');
      expect(Array.from(deserializeTxBytes(last.data.tx as string))).toEqual(Array.from(tx));

      spy.respondSuccess('tx-hash-base64');
      await expect(promise).resolves.toMatchObject({ status: 'success' });
    });
  });

  describe('uuid routing', () => {
    it('only resolves when the response key matches', async () => {
      const executor = new AdenaExecutor();
      const promise = executor.getCosmosKey('atomone-1');
      const last = spy.getLast();

      // Stray response for a different key must not resolve the promise.
      const stray = new MessageEvent('message', {
        data: { ...last, status: 'success', data: {}, key: 'different-key' },
        origin: mockOrigin(),
      });
      window.dispatchEvent(stray);

      let settled = false;
      promise.then(() => {
        settled = true;
      });
      await Promise.resolve();
      expect(settled).toBe(false);

      spy.respondSuccess({});
      await promise;
    });
  });
});
