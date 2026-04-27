import type Transport from '@ledgerhq/hw-transport';
import CosmosApp from 'ledger-cosmos-js';

import { ensureAppOpen } from './ledger-app-utils';
import { LedgerError } from './ledger-errors';

jest.mock('ledger-cosmos-js');

const MockedCosmosApp = CosmosApp as unknown as jest.Mock;

type AppInfoMock = jest.Mock<Promise<unknown>, []>;

function makeTransport(): { transport: Transport; send: jest.Mock } {
  const send = jest.fn().mockResolvedValue(Buffer.from([0x90, 0x00]));
  const transport = { send } as unknown as Transport;
  return { transport, send };
}

function ok(appName: string) {
  return {
    appName,
    appVersion: '1.0.0',
    return_code: 0x9000,
    error_message: 'No errors',
  };
}

function mockAppInfoSequence(responses: Array<unknown>): AppInfoMock {
  const appInfo = jest.fn() as AppInfoMock;
  for (const res of responses) {
    appInfo.mockResolvedValueOnce(res as never);
  }
  return appInfo;
}

describe('ensureAppOpen', () => {
  beforeEach(() => {
    MockedCosmosApp.mockReset();
  });

  it('resolves immediately when the expected app is already open', async () => {
    const { transport, send } = makeTransport();
    const appInfo = mockAppInfoSequence([ok('Cosmos')]);
    MockedCosmosApp.mockImplementation(() => ({ appInfo }));

    const result = await ensureAppOpen(transport, 'Cosmos', {
      pollIntervalMs: 1,
      maxAttempts: 3,
    });

    expect(result).toBe(transport);
    expect(appInfo).toHaveBeenCalledTimes(1);
    expect(send).not.toHaveBeenCalled();
  });

  it('opens the app and resolves after polling until the correct app appears', async () => {
    const { transport, send } = makeTransport();
    const appInfo = mockAppInfoSequence([
      ok('Ethereum'),
      ok('Ethereum'),
      ok('Ethereum'),
      ok('Cosmos'),
    ]);
    MockedCosmosApp.mockImplementation(() => ({ appInfo }));

    const reopenTransport = jest.fn().mockResolvedValue(transport);

    const result = await ensureAppOpen(transport, 'Cosmos', {
      pollIntervalMs: 1,
      maxAttempts: 10,
      reopenTransport,
    });

    expect(result).toBe(transport);
    expect(send).toHaveBeenCalledWith(
      0xe0,
      0xd8,
      0x00,
      0x00,
      Buffer.from('Cosmos', 'ascii'),
    );
    expect(reopenTransport).toHaveBeenCalledTimes(3);
    expect(appInfo).toHaveBeenCalledTimes(4);
  });

  it('throws LedgerError("AppNotOpen") when the app never switches', async () => {
    const { transport } = makeTransport();
    const appInfo = jest.fn().mockResolvedValue(ok('Ethereum'));
    MockedCosmosApp.mockImplementation(() => ({ appInfo }));

    await expect(
      ensureAppOpen(transport, 'Cosmos', {
        pollIntervalMs: 1,
        maxAttempts: 3,
      }),
    ).rejects.toMatchObject({
      name: 'LedgerError',
      kind: 'AppNotOpen',
    });

    expect(appInfo).toHaveBeenCalledTimes(4); // 1 initial + 3 polls
  });

  it('continues polling if reopenTransport throws transiently', async () => {
    const { transport } = makeTransport();
    const appInfo = mockAppInfoSequence([ok('Ethereum'), ok('Cosmos')]);
    MockedCosmosApp.mockImplementation(() => ({ appInfo }));

    const reopenTransport = jest
      .fn<Promise<Transport>, []>()
      .mockRejectedValueOnce(new Error('transport closed'))
      .mockResolvedValue(transport);

    const result = await ensureAppOpen(transport, 'Cosmos', {
      pollIntervalMs: 1,
      maxAttempts: 5,
      reopenTransport,
    });

    expect(result).toBe(transport);
    expect(reopenTransport).toHaveBeenCalledTimes(2);
  });

  it('treats a failed appInfo call as "not open" and keeps polling', async () => {
    const { transport } = makeTransport();
    const appInfo = jest
      .fn()
      .mockRejectedValueOnce(new Error('disconnected'))
      .mockRejectedValueOnce(new Error('still disconnected'))
      .mockResolvedValueOnce(ok('Cosmos'));
    MockedCosmosApp.mockImplementation(() => ({ appInfo }));

    const result = await ensureAppOpen(transport, 'Cosmos', {
      pollIntervalMs: 1,
      maxAttempts: 5,
    });

    expect(result).toBe(transport);
    expect(appInfo).toHaveBeenCalledTimes(3);
  });

  it('throws a plain LedgerError instance so callers can check with instanceof', async () => {
    const { transport } = makeTransport();
    const appInfo = jest.fn().mockResolvedValue(ok('Ethereum'));
    MockedCosmosApp.mockImplementation(() => ({ appInfo }));

    await ensureAppOpen(transport, 'Cosmos', {
      pollIntervalMs: 1,
      maxAttempts: 1,
    }).catch((err) => {
      expect(err).toBeInstanceOf(LedgerError);
    });
  });
});
