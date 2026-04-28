// Stub out `@adena-wallet/sdk` to avoid loading @web3auth's native crypto,
// which fails under jsdom's Uint8Array. Handlers use the enum values as
// plain strings.
jest.mock('@adena-wallet/sdk', () => ({
  WalletResponseFailureType: {
    INVALID_FORMAT: 'INVALID_FORMAT',
    NOT_CONNECTED: 'NOT_CONNECTED',
    NO_ACCOUNT: 'NO_ACCOUNT',
    UNSUPPORTED_TYPE: 'UNSUPPORTED_TYPE',
    UNEXPECTED_ERROR: 'UNEXPECTED_ERROR',
    NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
    TRANSACTION_FAILED: 'TRANSACTION_FAILED',
    WALLET_LOCKED: 'WALLET_LOCKED',
  },
  WalletResponseRejectType: {
    CONNECTION_REJECTED: 'CONNECTION_REJECTED',
    SIGN_REJECTED: 'SIGN_REJECTED',
  },
  WalletMessageInfo: {
    WALLET_LOCKED: {
      code: 2000,
      status: 'failure',
      type: 'WALLET_LOCKED',
      message: 'Adena is Locked.',
    },
    SIGN_REJECTED: {
      code: 4000,
      status: 'failure',
      type: 'SIGN_REJECTED',
      message: 'The signature has been rejected by the user.',
    },
  },
}));

const mockCreatePopup = jest.fn();
jest.mock('..', () => ({
  HandlerMethod: {
    createPopup: (...args: unknown[]): unknown => mockCreatePopup(...args),
  },
}));

const mockBroadcastTx = jest.fn();
jest.mock('@common/provider/cosmos/cosmos-lcd-provider', () => ({
  CosmosLcdProvider: jest.fn().mockImplementation(() => ({
    broadcastTx: mockBroadcastTx,
  })),
}));

import {
  cosmosEnable,
  cosmosGetKey,
  cosmosSendTx,
  cosmosSignAmino,
  cosmosSignDirect,
} from './cosmos';
import { base64ToBytes, bytesToBase64 } from '@common/utils/encoding-util';
import { toBech32 } from '@cosmjs/encoding';

const SAMPLE_ADDRESS_BYTES = new Uint8Array(20).map((_, i) => i + 1);
const SAMPLE_BECH32 = toBech32('atone', SAMPLE_ADDRESS_BYTES);

type FakeCore = {
  chainRegistry: {
    getChainByChainId: jest.Mock;
    listNetworkProfilesByChain: jest.Mock;
  };
  establishAtomOneService: {
    isEstablishedBy: jest.Mock;
  };
  getCurrentAccountId: jest.Mock;
  getCurrentAccount: jest.Mock;
  getInMemoryKey: jest.Mock;
  isLockedBy: jest.Mock;
};

const ATOMONE_CHAIN = { chainGroup: 'atomone', bech32Prefix: 'atone' };

function makeCore(overrides?: Partial<FakeCore>): FakeCore {
  const core: FakeCore = {
    chainRegistry: {
      getChainByChainId: jest.fn((id: string) =>
        id === 'atomone-1' ? ATOMONE_CHAIN : undefined,
      ),
      listNetworkProfilesByChain: jest.fn(() => [
        {
          id: 'atomone-1:mainnet',
          chainType: 'cosmos',
          chainGroup: 'atomone',
          chainId: 'atomone-1',
          displayName: 'AtomOne',
          chainIconUrl: '',
          nativeTokenId: 'atomone-1:uatone',
          isMainnet: true,
          rpcEndpoints: ['https://rpc.example'],
          restEndpoints: ['https://rest.example'],
        },
      ]),
    },
    establishAtomOneService: {
      isEstablishedBy: jest.fn(async () => true),
    },
    getCurrentAccountId: jest.fn(async () => 'acc-1'),
    getCurrentAccount: jest.fn(async () => ({
      id: 'acc-1',
      name: 'Account 1',
      type: 'HD_WALLET',
      publicKey: new Uint8Array([1, 2, 3, 4]),
      resolveAddress: async () => SAMPLE_BECH32,
    })),
    getInMemoryKey: jest.fn(async () => null),
    isLockedBy: jest.fn(async () => false),
    ...overrides,
  };
  return core;
}

import { InjectionMessage } from '../message';

function makeMessage(
  type: string,
  data: Record<string, unknown> = {},
): InjectionMessage {
  return {
    code: 0,
    type: type as InjectionMessage['type'],
    status: 'request',
    key: 'req-1',
    hostname: 'dapp.example',
    protocol: 'https:',
    message: '',
    data,
  };
}

describe('cosmos handlers', () => {
  beforeEach(() => {
    mockCreatePopup.mockReset();
    mockBroadcastTx.mockReset();
  });

  describe('cosmosEnable', () => {
    it('returns INVALID_FORMAT when chainIds missing', async () => {
      const core = makeCore();
      const send = jest.fn();
      await cosmosEnable(core as never, makeMessage('ENABLE_COSMOS', {}), send);
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failure', message: 'INVALID_FORMAT' }),
      );
    });

    it('returns UNSUPPORTED_TYPE for non-atomone chainId', async () => {
      const core = makeCore();
      const send = jest.fn();
      await cosmosEnable(
        core as never,
        makeMessage('ENABLE_COSMOS', { chainIds: 'cosmoshub-4' }),
        send,
      );
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failure', message: 'UNSUPPORTED_TYPE' }),
      );
    });

    it('short-circuits success when all chainIds are already connected', async () => {
      const core = makeCore();
      const send = jest.fn();
      await cosmosEnable(
        core as never,
        makeMessage('ENABLE_COSMOS', { chainIds: ['atomone-1'] }),
        send,
      );
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'success', type: 'ENABLE_COSMOS' }),
      );
      expect(mockCreatePopup).not.toHaveBeenCalled();
    });

    it('routes to the establish popup when not connected', async () => {
      const core = makeCore({
        establishAtomOneService: { isEstablishedBy: jest.fn(async () => false) },
      } as never);
      const send = jest.fn();
      await cosmosEnable(
        core as never,
        makeMessage('ENABLE_COSMOS', { chainIds: 'atomone-1' }),
        send,
      );
      expect(mockCreatePopup).toHaveBeenCalledTimes(1);
      expect(mockCreatePopup.mock.calls[0][0]).toBe('/approve/wallet/establish-cosmos');
    });
  });

  describe('cosmosGetKey', () => {
    it('fails with UNSUPPORTED_TYPE when chainId is outside atomone', async () => {
      const core = makeCore();
      const send = jest.fn();
      await cosmosGetKey(
        core as never,
        makeMessage('GET_COSMOS_KEY', { chainId: 'cosmoshub-4' }),
        send,
      );
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'UNSUPPORTED_TYPE' }),
      );
    });

    it('routes to the silent unlock popup when wallet is locked', async () => {
      const core = makeCore({
        isLockedBy: jest.fn(async () => true),
      } as never);
      const send = jest.fn();
      await cosmosGetKey(
        core as never,
        makeMessage('GET_COSMOS_KEY', { chainId: 'atomone-1' }),
        send,
      );
      expect(mockCreatePopup).toHaveBeenCalledTimes(1);
      expect(mockCreatePopup.mock.calls[0][0]).toBe('/approve/wallet/get-cosmos-key');
      // Close fallback still carries Gno-compatible WALLET_LOCKED shape so
      // closing the login popup without unlocking yields a clean failure.
      expect(mockCreatePopup.mock.calls[0][2]).toMatchObject({
        status: 'failure',
        code: 2000,
        type: 'WALLET_LOCKED',
        message: 'Adena is Locked.',
      });
    });

    it('fails with NOT_CONNECTED when site is not established', async () => {
      const core = makeCore({
        establishAtomOneService: { isEstablishedBy: jest.fn(async () => false) },
      } as never);
      const send = jest.fn();
      await cosmosGetKey(
        core as never,
        makeMessage('GET_COSMOS_KEY', { chainId: 'atomone-1' }),
        send,
      );
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'NOT_CONNECTED' }),
      );
    });

    it('returns the key with base64-encoded pubKey and address on success', async () => {
      const core = makeCore();
      const send = jest.fn();
      await cosmosGetKey(
        core as never,
        makeMessage('GET_COSMOS_KEY', { chainId: 'atomone-1' }),
        send,
      );
      const response = send.mock.calls[0][0];
      expect(response.status).toBe('success');
      expect(response.data.bech32Address).toMatch(/^atone1/);
      expect(typeof response.data.pubKey).toBe('string');
      expect(typeof response.data.address).toBe('string');
      // pubKey bytes round-trip
      expect(Array.from(base64ToBytes(response.data.pubKey))).toEqual([1, 2, 3, 4]);
      // address is non-empty after bech32 decode
      expect(base64ToBytes(response.data.address).length).toBeGreaterThan(0);
    });
  });

  describe('cosmosSignAmino', () => {
    const validDoc = {
      chain_id: 'atomone-1',
      account_number: '0',
      sequence: '0',
      fee: { amount: [], gas: '200000' },
      msgs: [],
      memo: '',
    };

    it('rejects invalid signDoc with INVALID_FORMAT', async () => {
      const core = makeCore();
      const send = jest.fn();
      await cosmosSignAmino(
        core as never,
        makeMessage('SIGN_COSMOS_AMINO', {
          chainId: 'atomone-1',
          signer: 'atone1…',
          signDoc: { chain_id: 'atomone-1' },
        }),
        send,
      );
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'INVALID_FORMAT' }),
      );
    });

    it('routes to the sign popup when inputs are valid', async () => {
      const core = makeCore();
      const send = jest.fn();
      await cosmosSignAmino(
        core as never,
        makeMessage('SIGN_COSMOS_AMINO', {
          chainId: 'atomone-1',
          signer: 'atone1…',
          signDoc: validDoc,
        }),
        send,
      );
      expect(mockCreatePopup).toHaveBeenCalledTimes(1);
      expect(mockCreatePopup.mock.calls[0][0]).toBe('/approve/wallet/sign-cosmos');
      // Cancel/close message uses the SDK's WalletMessageInfo entry so the
      // dApp sees Gno-compatible code/message on rejection.
      expect(mockCreatePopup.mock.calls[0][2]).toMatchObject({
        status: 'failure',
        type: 'SIGN_REJECTED',
        code: 4000,
        message: 'The signature has been rejected by the user.',
      });
    });
  });

  describe('cosmosSignDirect', () => {
    const validSerializedDoc = {
      bodyBytes: bytesToBase64([1, 2, 3]),
      authInfoBytes: bytesToBase64([4, 5, 6]),
      chainId: 'atomone-1',
      accountNumber: '12',
    };

    it('rejects malformed serialized signDoc', async () => {
      const core = makeCore();
      const send = jest.fn();
      await cosmosSignDirect(
        core as never,
        makeMessage('SIGN_COSMOS_DIRECT', {
          chainId: 'atomone-1',
          signer: 'atone1…',
          signDoc: { chainId: 'atomone-1' },
        }),
        send,
      );
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'INVALID_FORMAT' }),
      );
    });

    it('routes to the sign popup when inputs are valid', async () => {
      const core = makeCore();
      const send = jest.fn();
      await cosmosSignDirect(
        core as never,
        makeMessage('SIGN_COSMOS_DIRECT', {
          chainId: 'atomone-1',
          signer: 'atone1…',
          signDoc: validSerializedDoc,
        }),
        send,
      );
      expect(mockCreatePopup).toHaveBeenCalledTimes(1);
      expect(mockCreatePopup.mock.calls[0][0]).toBe('/approve/wallet/sign-cosmos');
      expect(mockCreatePopup.mock.calls[0][2]).toMatchObject({
        status: 'failure',
        type: 'SIGN_REJECTED',
        code: 4000,
        message: 'The signature has been rejected by the user.',
      });
    });
  });

  describe('cosmosSendTx', () => {
    const validTx = bytesToBase64([9, 8, 7]);

    it('returns INVALID_FORMAT on missing fields', async () => {
      const core = makeCore();
      const send = jest.fn();
      await cosmosSendTx(
        core as never,
        makeMessage('SEND_COSMOS_TX', { chainId: 'atomone-1', tx: validTx }),
        send,
      );
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'INVALID_FORMAT' }),
      );
    });

    it('broadcasts through CosmosLcdProvider and surfaces txhash', async () => {
      const core = makeCore();
      const send = jest.fn();
      mockBroadcastTx.mockResolvedValueOnce({
        txhash: 'ABCD',
        code: 0,
        rawLog: '',
        height: '100',
      });
      await cosmosSendTx(
        core as never,
        makeMessage('SEND_COSMOS_TX', {
          chainId: 'atomone-1',
          tx: validTx,
          mode: 'sync',
        }),
        send,
      );
      expect(mockBroadcastTx).toHaveBeenCalledTimes(1);
      const [txBytesArg, modeArg] = mockBroadcastTx.mock.calls[0];
      expect(Array.from(txBytesArg)).toEqual([9, 8, 7]);
      expect(modeArg).toBe('BROADCAST_MODE_SYNC');
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'success',
          data: expect.objectContaining({ txhash: 'ABCD' }),
        }),
      );
    });

    it('maps broadcast errors to TRANSACTION_FAILED', async () => {
      const core = makeCore();
      const send = jest.fn();
      mockBroadcastTx.mockRejectedValueOnce(new Error('rpc down'));
      await cosmosSendTx(
        core as never,
        makeMessage('SEND_COSMOS_TX', {
          chainId: 'atomone-1',
          tx: validTx,
          mode: 'sync',
        }),
        send,
      );
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failure',
          message: 'TRANSACTION_FAILED',
          data: expect.objectContaining({ error: 'rpc down' }),
        }),
      );
    });
  });

  describe('error guards', () => {
    // Each handler must respond with UNEXPECTED_ERROR instead of leaving the
    // message port open when an internal dependency throws. This mirrors the
    // pattern already used by the Gno handlers (`wallet.ts:getAccount`). Not
    // wrapping these paths would leave `sendResponse` uninvoked and produce
    // Chrome's "message channel closed before a response was received" error.

    it('cosmosEnable answers UNEXPECTED_ERROR when establishAtomOneService throws', async () => {
      const core = makeCore({
        establishAtomOneService: {
          isEstablishedBy: jest.fn().mockRejectedValue(new Error('boom')),
        },
      } as never);
      const send = jest.fn();
      await cosmosEnable(
        core as never,
        makeMessage('ENABLE_COSMOS', { chainIds: ['atomone-1'] }),
        send,
      );
      expect(send).toHaveBeenCalledTimes(1);
      expect(send.mock.calls[0][0]).toMatchObject({
        type: 'ENABLE_COSMOS',
        status: 'failure',
        message: 'UNEXPECTED_ERROR',
        data: { error: 'boom' },
      });
    });

    it('cosmosGetKey answers UNEXPECTED_ERROR when resolveAddress throws', async () => {
      const core = makeCore({
        getCurrentAccount: jest.fn(async () => ({
          id: 'acc-1',
          name: 'Account 1',
          type: 'HD_WALLET',
          publicKey: new Uint8Array([1, 2, 3, 4]),
          resolveAddress: async () => {
            throw new Error('resolve-fail');
          },
        })),
      } as never);
      const send = jest.fn();
      await cosmosGetKey(
        core as never,
        makeMessage('GET_COSMOS_KEY', { chainId: 'atomone-1' }),
        send,
      );
      expect(send).toHaveBeenCalledTimes(1);
      expect(send.mock.calls[0][0]).toMatchObject({
        type: 'GET_COSMOS_KEY',
        status: 'failure',
        message: 'UNEXPECTED_ERROR',
        data: { error: 'resolve-fail' },
      });
    });

    it('cosmosSignAmino answers UNEXPECTED_ERROR when the establish gate throws', async () => {
      const core = makeCore({
        establishAtomOneService: {
          isEstablishedBy: jest.fn().mockRejectedValue(new Error('gate-fail')),
        },
      } as never);
      const send = jest.fn();
      await cosmosSignAmino(
        core as never,
        makeMessage('SIGN_COSMOS_AMINO', {
          chainId: 'atomone-1',
          signer: 'atone1…',
          signDoc: {
            chain_id: 'atomone-1',
            account_number: '0',
            sequence: '0',
            fee: { amount: [], gas: '200000' },
            msgs: [],
            memo: '',
          },
        }),
        send,
      );
      expect(send).toHaveBeenCalledTimes(1);
      expect(send.mock.calls[0][0]).toMatchObject({
        type: 'SIGN_COSMOS_AMINO',
        status: 'failure',
        message: 'UNEXPECTED_ERROR',
        data: { error: 'gate-fail' },
      });
    });

    it('cosmosSignDirect answers UNEXPECTED_ERROR when the establish gate throws', async () => {
      const core = makeCore({
        establishAtomOneService: {
          isEstablishedBy: jest.fn().mockRejectedValue(new Error('gate-fail')),
        },
      } as never);
      const send = jest.fn();
      await cosmosSignDirect(
        core as never,
        makeMessage('SIGN_COSMOS_DIRECT', {
          chainId: 'atomone-1',
          signer: 'atone1…',
          signDoc: {
            bodyBytes: bytesToBase64([1, 2, 3]),
            authInfoBytes: bytesToBase64([4, 5, 6]),
            chainId: 'atomone-1',
            accountNumber: '12',
          },
        }),
        send,
      );
      expect(send).toHaveBeenCalledTimes(1);
      expect(send.mock.calls[0][0]).toMatchObject({
        type: 'SIGN_COSMOS_DIRECT',
        status: 'failure',
        message: 'UNEXPECTED_ERROR',
        data: { error: 'gate-fail' },
      });
    });

    it('cosmosSendTx answers UNEXPECTED_ERROR when the chain registry throws', async () => {
      const core = makeCore({
        chainRegistry: {
          getChainByChainId: jest.fn((id: string) =>
            id === 'atomone-1' ? ATOMONE_CHAIN : undefined,
          ),
          listNetworkProfilesByChain: jest.fn(() => {
            throw new Error('registry-fail');
          }),
        },
      } as never);
      const send = jest.fn();
      await cosmosSendTx(
        core as never,
        makeMessage('SEND_COSMOS_TX', {
          chainId: 'atomone-1',
          tx: bytesToBase64([9, 8, 7]),
          mode: 'sync',
        }),
        send,
      );
      expect(send).toHaveBeenCalledTimes(1);
      expect(send.mock.calls[0][0]).toMatchObject({
        type: 'SEND_COSMOS_TX',
        status: 'failure',
        message: 'UNEXPECTED_ERROR',
        data: { error: 'registry-fail' },
      });
    });
  });
});
