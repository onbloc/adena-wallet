jest.mock('@adena-wallet/sdk', () => ({
  WalletResponseFailureType: {
    INVALID_FORMAT: 'INVALID_FORMAT',
    REDUNDANT_CHANGE_REQUEST: 'REDUNDANT_CHANGE_REQUEST',
    UNADDED_NETWORK: 'UNADDED_NETWORK',
    UNSUPPORTED_TYPE: 'UNSUPPORTED_TYPE',
    NETWORK_ALREADY_EXISTS: 'NETWORK_ALREADY_EXISTS',
  },
  WalletResponseRejectType: {
    SWITCH_NETWORK_REJECTED: 'SWITCH_NETWORK_REJECTED',
    ADD_NETWORK_REJECTED: 'ADD_NETWORK_REJECTED',
  },
  WalletMessageInfo: {
    INVALID_FORMAT: {
      code: 3000,
      status: 'failure',
      type: 'INVALID_FORMAT',
      message: 'Invalid format.',
    },
    REDUNDANT_CHANGE_REQUEST: {
      code: 4001,
      status: 'failure',
      type: 'REDUNDANT_CHANGE_REQUEST',
      message: 'Redundant change request.',
    },
    UNADDED_NETWORK: {
      code: 4004,
      status: 'failure',
      type: 'UNADDED_NETWORK',
      message: 'Network not added.',
    },
    UNSUPPORTED_TYPE: {
      code: 4005,
      status: 'failure',
      type: 'UNSUPPORTED_TYPE',
      message: 'Adena does not support the requested transaction type.',
    },
    SWITCH_NETWORK_REJECTED: {
      code: 4000,
      status: 'failure',
      type: 'SWITCH_NETWORK_REJECTED',
      message: 'Switch network rejected.',
    },
    ADD_NETWORK_REJECTED: {
      code: 4000,
      status: 'failure',
      type: 'ADD_NETWORK_REJECTED',
      message: 'Add network rejected.',
    },
    NETWORK_ALREADY_EXISTS: {
      code: 4003,
      status: 'failure',
      type: 'NETWORK_ALREADY_EXISTS',
      message: 'Network already exists.',
    },
  },
}));

const mockCreatePopup = jest.fn();
jest.mock('..', () => ({
  HandlerMethod: {
    createPopup: (...args: unknown[]): unknown => mockCreatePopup(...args),
  },
}));

import { InjectionMessage } from '../message';
import { addNetwork, switchNetwork } from './network';

type FakeCore = {
  chainService: {
    getCurrentNetwork: jest.Mock;
    getNetworks: jest.Mock;
  };
  getInMemoryKey: jest.Mock;
  getCurrentAccount: jest.Mock;
  isLockedBy: jest.Mock;
};

function makeCore(overrides?: Partial<FakeCore>): FakeCore {
  return {
    chainService: {
      getCurrentNetwork: jest.fn(async () => ({ networkId: 'portal-loop' })),
      getNetworks: jest.fn(async () => [
        {
          id: 'network-1',
          chainId: 'test-1',
          deleted: false,
        },
      ]),
    },
    getInMemoryKey: jest.fn(async () => null),
    getCurrentAccount: jest.fn(async () => ({
      id: 'account-1',
      type: 'HD_WALLET',
    })),
    isLockedBy: jest.fn(async () => false),
    ...overrides,
  };
}

function makeMessage(data: Record<string, unknown> = {}): InjectionMessage {
  return {
    code: 0,
    type: 'SWITCH_NETWORK' as InjectionMessage['type'],
    status: 'request',
    key: 'req-1',
    hostname: 'dapp.example',
    protocol: 'https:',
    message: '',
    data,
  };
}

describe('switchNetwork handler', () => {
  beforeEach(() => {
    mockCreatePopup.mockReset();
  });

  it('returns UNSUPPORTED_TYPE for SessionAccount before other checks', async () => {
    const core = makeCore({
      getCurrentAccount: jest.fn(async () => ({
        id: 'session-1',
        type: 'SESSION',
      })),
    });
    const send = jest.fn();

    await switchNetwork(core as never, makeMessage({ chainId: '' }), send);

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failure',
        type: 'UNSUPPORTED_TYPE',
        code: 4005,
        message: 'Adena does not support the requested transaction type.',
      }),
    );
    expect(core.chainService.getCurrentNetwork).not.toHaveBeenCalled();
    expect(mockCreatePopup).not.toHaveBeenCalled();
  });

  it('keeps the existing popup flow for non-session accounts', async () => {
    const core = makeCore();
    const send = jest.fn();

    await switchNetwork(core as never, makeMessage({ chainId: 'test-1' }), send);

    expect(mockCreatePopup).toHaveBeenCalledTimes(1);
    expect(mockCreatePopup.mock.calls[0][0]).toBe('/approve/wallet/network/change');
    expect(send).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'UNSUPPORTED_TYPE' }),
    );
  });
});

describe('addNetwork handler', () => {
  beforeEach(() => {
    mockCreatePopup.mockReset();
  });

  // Adding a network mutates wallet-wide state, exactly like switching one, so a
  // dApp must not be able to drive it while a SessionAccount is selected.
  it('returns UNSUPPORTED_TYPE for SessionAccount before other checks', async () => {
    const core = makeCore({
      getCurrentAccount: jest.fn(async () => ({
        id: 'session-1',
        type: 'SESSION',
      })),
    });
    const send = jest.fn();

    await addNetwork(
      core as never,
      makeMessage({ chainId: 'test-2', chainName: 'Test 2', rpcUrl: 'https://rpc.example' }),
      send,
    );

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failure',
        type: 'UNSUPPORTED_TYPE',
        code: 4005,
      }),
    );
    expect(core.isLockedBy).not.toHaveBeenCalled();
    expect(mockCreatePopup).not.toHaveBeenCalled();
  });

  it('keeps the existing popup flow for non-session accounts', async () => {
    const core = makeCore();
    const send = jest.fn();

    await addNetwork(
      core as never,
      makeMessage({ chainId: 'test-2', chainName: 'Test 2', rpcUrl: 'https://rpc.example' }),
      send,
    );

    expect(mockCreatePopup).toHaveBeenCalled();
  });
});
