jest.mock('@adena-wallet/sdk', () => ({
  WalletResponseFailureType: {
    UNSUPPORTED_TYPE: 'UNSUPPORTED_TYPE',
  },
  WalletResponseRejectType: {
    SIGN_REJECTED: 'SIGN_REJECTED',
  },
  WalletMessageInfo: {
    UNSUPPORTED_TYPE: {
      code: 4005,
      status: 'failure',
      type: 'UNSUPPORTED_TYPE',
      message: 'Adena does not support the requested transaction type.',
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

import { InjectionMessage } from '../message';
import {
  broadcastMultisigTransaction,
  createMultisigAccount,
  createMultisigDocument,
  signMultisigDocument,
} from './multisig';

type FakeCore = {
  getInMemoryKey: jest.Mock;
  getCurrentAccount: jest.Mock;
};

type MultisigRunner = (
  core: FakeCore,
  message: InjectionMessage,
  sendResponse: jest.Mock,
) => Promise<void>;

function makeCore(overrides?: Partial<FakeCore>): FakeCore {
  return {
    getInMemoryKey: jest.fn(async () => null),
    getCurrentAccount: jest.fn(async () => ({
      id: 'account-1',
      type: 'HD_WALLET',
    })),
    ...overrides,
  };
}

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

describe('multisig handlers', () => {
  beforeEach(() => {
    mockCreatePopup.mockReset();
  });

  describe('session account guard', () => {
    function makeSessionCore(): FakeCore {
      return makeCore({
        getCurrentAccount: jest.fn(async () => ({
          id: 'session-1',
          type: 'SESSION',
        })),
      });
    }

    const cases: Array<[string, MultisigRunner]> = [
      [
        'CREATE_MULTISIG_ACCOUNT',
        (core, message, send) => createMultisigAccount(core as never, message, send),
      ],
      [
        'CREATE_MULTISIG_TRANSACTION',
        (core, message, send) => createMultisigDocument(core as never, message, send),
      ],
      [
        'SIGN_MULTISIG_TRANSACTION',
        (core, message, send) => signMultisigDocument(core as never, message, send),
      ],
      [
        'BROADCAST_MULTISIG_TRANSACTION',
        (core, message, send) => broadcastMultisigTransaction(core as never, message, send),
      ],
    ];

    it.each(cases)('returns UNSUPPORTED_TYPE for %s', async (type, run) => {
      const core = makeSessionCore();
      const send = jest.fn();

      await run(core, makeMessage(type, {}), send);

      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failure',
          type: 'UNSUPPORTED_TYPE',
          code: 4005,
          message: 'Adena does not support the requested transaction type.',
        }),
      );
      expect(mockCreatePopup).not.toHaveBeenCalled();
    });
  });

  it('keeps the existing create account popup flow for non-session accounts', async () => {
    const core = makeCore();
    const send = jest.fn();

    await createMultisigAccount(
      core as never,
      makeMessage('CREATE_MULTISIG_ACCOUNT', { signers: [], threshold: 1 }),
      send,
    );

    expect(mockCreatePopup).toHaveBeenCalledTimes(1);
    expect(mockCreatePopup.mock.calls[0][0]).toBe('approve/wallet/create-multisig-account');
    expect(send).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'UNSUPPORTED_TYPE' }),
    );
  });
});
