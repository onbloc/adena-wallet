// Stub out `@adena-wallet/sdk` to avoid loading @web3auth's native crypto,
// which fails under jsdom's Uint8Array. Handlers use the enum values as
// plain strings. Mirrors the setup in `cosmos.spec.ts`.
jest.mock('@adena-wallet/sdk', () => ({
  WalletResponseFailureType: {
    ALREADY_CONNECTED: 'ALREADY_CONNECTED',
    INVALID_FORMAT: 'INVALID_FORMAT',
    UNADDED_NETWORK: 'UNADDED_NETWORK',
    UNSUPPORTED_TYPE: 'UNSUPPORTED_TYPE',
    NO_ACCOUNT: 'NO_ACCOUNT',
    WALLET_LOCKED: 'WALLET_LOCKED',
    NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  },
  WalletResponseRejectType: {
    CONNECTION_REJECTED: 'CONNECTION_REJECTED',
  },
  WalletResponseSuccessType: {
    GET_ACCOUNT_SUCCESS: 'GET_ACCOUNT_SUCCESS',
    GET_NETWORK_SUCCESS: 'GET_NETWORK_SUCCESS',
  },
  WalletMessageInfo: {
    ALREADY_CONNECTED: {
      code: 1000,
      status: 'failure',
      type: 'ALREADY_CONNECTED',
      message: 'Already connected.',
    },
    INVALID_FORMAT: {
      code: 3000,
      status: 'failure',
      type: 'INVALID_FORMAT',
      message: 'Invalid format.',
    },
    UNADDED_NETWORK: {
      code: 3000,
      status: 'failure',
      type: 'UNADDED_NETWORK',
      message: 'Network not added.',
    },
    UNSUPPORTED_TYPE: {
      code: 3000,
      status: 'failure',
      type: 'UNSUPPORTED_TYPE',
      message: 'Unsupported type.',
    },
    CONNECTION_REJECTED: {
      code: 4000,
      status: 'failure',
      type: 'CONNECTION_REJECTED',
      message: 'Rejected.',
    },
  },
}));

const mockCreatePopup = jest.fn();
jest.mock('..', () => ({
  HandlerMethod: {
    createPopup: (...args: unknown[]): unknown => mockCreatePopup(...args),
  },
}));

import { addEstablish } from './wallet';
import { InjectionMessage } from '../message';

const GNO_CHAIN = { chainGroup: 'gno', bech32Prefix: 'g' };
const ATOMONE_CHAIN = { chainGroup: 'atomone', bech32Prefix: 'atone' };
const COSMOSHUB_CHAIN = { chainGroup: 'cosmoshub', bech32Prefix: 'cosmos' };

type FakeCore = {
  chainRegistry: {
    getChainByChainId: jest.Mock;
  };
  establishService: {
    isEstablishedBy: jest.Mock;
  };
  establishAtomOneService: {
    isEstablishedBy: jest.Mock;
  };
  getCurrentAccountId: jest.Mock;
  getInMemoryKey: jest.Mock;
  isLockedBy: jest.Mock;
};

function makeCore(overrides?: Partial<FakeCore>): FakeCore {
  return {
    chainRegistry: {
      getChainByChainId: jest.fn((id: string) => {
        if (id === 'gnoland1' || id === 'staging') return GNO_CHAIN;
        if (id === 'atomone-1') return ATOMONE_CHAIN;
        if (id === 'cosmoshub-4') return COSMOSHUB_CHAIN;
        return undefined;
      }),
    },
    establishService: {
      isEstablishedBy: jest.fn(async () => false),
    },
    establishAtomOneService: {
      isEstablishedBy: jest.fn(async () => false),
    },
    getCurrentAccountId: jest.fn(async () => 'acc-1'),
    getInMemoryKey: jest.fn(async () => null),
    isLockedBy: jest.fn(async () => false),
    ...overrides,
  };
}

function makeMessage(data: Record<string, unknown> = {}): InjectionMessage {
  return {
    code: 0,
    type: 'ADD_ESTABLISH' as InjectionMessage['type'],
    status: 'request',
    key: 'req-1',
    hostname: 'dapp.example',
    protocol: 'https:',
    message: '',
    data: { name: 'Test dApp', ...data },
  };
}

describe('addEstablish handler (Stage 8 — cross-protocol router)', () => {
  beforeEach(() => {
    mockCreatePopup.mockReset();
  });

  describe('legacy single-chain path (no chainIds)', () => {
    it('returns ALREADY_CONNECTED when the hostname is already established', async () => {
      const core = makeCore({
        establishService: { isEstablishedBy: jest.fn(async () => true) },
      } as never);
      const send = jest.fn();
      await addEstablish(core as never, makeMessage(), send);
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failure', type: 'ALREADY_CONNECTED' }),
      );
      expect(mockCreatePopup).not.toHaveBeenCalled();
    });

    it('opens the approve popup when not established', async () => {
      const core = makeCore();
      const send = jest.fn();
      await addEstablish(core as never, makeMessage(), send);
      expect(mockCreatePopup).toHaveBeenCalledTimes(1);
      expect(mockCreatePopup.mock.calls[0][0]).toBe('/approve/wallet/establish');
    });
  });

  describe('multi-chain path (chainIds provided)', () => {
    it('rejects INVALID_FORMAT when chainIds is empty string', async () => {
      const core = makeCore();
      const send = jest.fn();
      await addEstablish(core as never, makeMessage({ chainIds: '' }), send);
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failure', type: 'INVALID_FORMAT' }),
      );
      expect(mockCreatePopup).not.toHaveBeenCalled();
    });

    it('rejects UNADDED_NETWORK when any chainId is unknown', async () => {
      const core = makeCore();
      const send = jest.fn();
      await addEstablish(
        core as never,
        makeMessage({ chainIds: ['gnoland1', 'unknown-chain'] }),
        send,
      );
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failure', type: 'UNADDED_NETWORK' }),
      );
      expect(mockCreatePopup).not.toHaveBeenCalled();
    });

    it('rejects UNSUPPORTED_TYPE for chainGroups outside the whitelist (e.g. cosmoshub)', async () => {
      const core = makeCore();
      const send = jest.fn();
      await addEstablish(
        core as never,
        makeMessage({ chainIds: ['gnoland1', 'cosmoshub-4'] }),
        send,
      );
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failure', type: 'UNSUPPORTED_TYPE' }),
      );
      expect(mockCreatePopup).not.toHaveBeenCalled();
    });

    it('routes to the approve popup when cross-protocol chainIds (gno + atomone) are provided', async () => {
      const core = makeCore();
      const send = jest.fn();
      await addEstablish(
        core as never,
        makeMessage({ chainIds: ['gnoland1', 'atomone-1'] }),
        send,
      );
      expect(mockCreatePopup).toHaveBeenCalledTimes(1);
      expect(mockCreatePopup.mock.calls[0][0]).toBe('/approve/wallet/establish');
    });

    it('short-circuits ALREADY_CONNECTED when every chainId is already established (per service)', async () => {
      const core = makeCore({
        establishService: { isEstablishedBy: jest.fn(async () => true) },
        establishAtomOneService: { isEstablishedBy: jest.fn(async () => true) },
      } as never);
      const send = jest.fn();
      await addEstablish(
        core as never,
        makeMessage({ chainIds: ['gnoland1', 'atomone-1'] }),
        send,
      );
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failure', type: 'ALREADY_CONNECTED' }),
      );
      expect(mockCreatePopup).not.toHaveBeenCalled();
    });

    it('opens the popup when only a subset of chainIds is already established (not every)', async () => {
      // Gno already connected, AtomOne not — all-established AND must fail,
      // so the handler should route to the popup rather than short-circuit.
      const core = makeCore({
        establishService: { isEstablishedBy: jest.fn(async () => true) },
        establishAtomOneService: { isEstablishedBy: jest.fn(async () => false) },
      } as never);
      const send = jest.fn();
      await addEstablish(
        core as never,
        makeMessage({ chainIds: ['gnoland1', 'atomone-1'] }),
        send,
      );
      expect(mockCreatePopup).toHaveBeenCalledTimes(1);
      expect(send).not.toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failure', type: 'ALREADY_CONNECTED' }),
      );
    });

    it('routes per chainGroup when checking ALREADY_CONNECTED — atomone chainId hits AtomOne service', async () => {
      const core = makeCore();
      const send = jest.fn();
      await addEstablish(
        core as never,
        makeMessage({ chainIds: ['atomone-1'] }),
        send,
      );
      expect(core.establishAtomOneService.isEstablishedBy).toHaveBeenCalledWith(
        'acc-1',
        expect.any(String),
        'atomone-1',
      );
      // Gno service must not be queried for an atomone-only request.
      expect(core.establishService.isEstablishedBy).not.toHaveBeenCalled();
    });
  });
});
