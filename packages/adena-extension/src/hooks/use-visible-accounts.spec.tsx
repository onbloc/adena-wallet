import { renderHook, waitFor } from '@testing-library/react';
import { Account } from 'adena-module';

import { useAdenaContext, useWalletContext } from './use-context';
import { useLoadAccounts } from './use-load-accounts';
import { useNetwork } from './use-network';
import { useVisibleAccounts } from './use-visible-accounts';
import { useConvertSessionAccounts } from './wallet/use-convert-session-accounts';

jest.mock('./use-context', () => ({
  useAdenaContext: jest.fn(),
  useWalletContext: jest.fn(),
}));

jest.mock('./use-load-accounts', () => ({
  useLoadAccounts: jest.fn(),
}));

jest.mock('./use-network', () => ({
  useNetwork: jest.fn(),
}));

jest.mock('./wallet/use-convert-session-accounts', () => ({
  useConvertSessionAccounts: jest.fn(),
}));

const useAdenaContextMock = useAdenaContext as jest.Mock;
const useWalletContextMock = useWalletContext as jest.Mock;
const useLoadAccountsMock = useLoadAccounts as jest.Mock;
const useNetworkMock = useNetwork as jest.Mock;
const useConvertSessionAccountsMock = useConvertSessionAccounts as jest.Mock;

const SESSION_ADDR = 'g1session';
const MASTER_ADDR = 'g1master';

const makeSessionAccount = (): Account =>
  ({
    id: 'session-1',
    index: 1,
    type: 'SESSION',
    name: 'Session 1',
    keyringId: 'keyring-1',
    publicKey: new Uint8Array(33),
    sessionConfig: {
      masterAddress: MASTER_ADDR,
      chainId: 'test-13',
      status: 'ACTIVE',
    },
    getAddress: jest.fn(async () => SESSION_ADDR),
    getMasterAddress: jest.fn(() => MASTER_ADDR),
    toData: jest.fn(),
  }) as unknown as Account;

describe('useVisibleAccounts', () => {
  const getSession = jest.fn();
  const getCachedSession = jest.fn();
  const convertBySessionAddresses = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    useLoadAccountsMock.mockReturnValue({ accounts: [makeSessionAccount()] });
    useNetworkMock.mockReturnValue({
      currentNetwork: {
        chainId: 'test-13',
        addressPrefix: 'g',
      },
    });
    useWalletContextMock.mockReturnValue({
      gnoProvider: { getSession },
    });
    useAdenaContextMock.mockReturnValue({
      sessionRepository: { get: getCachedSession },
    });
    useConvertSessionAccountsMock.mockReturnValue({
      convertBySessionAddresses,
    });
  });

  it('does not convert a missing chain session before metadata exists', async () => {
    getCachedSession.mockResolvedValue(null);
    getSession.mockResolvedValue(null);

    renderHook(() => useVisibleAccounts());

    await waitFor(() => expect(getSession).toHaveBeenCalledWith(MASTER_ADDR, SESSION_ADDR));
    expect(convertBySessionAddresses).not.toHaveBeenCalled();
  });

  it('does not convert a newly created session during chain visibility grace', async () => {
    getCachedSession.mockResolvedValue({
      masterAddress: MASTER_ADDR,
      chainId: 'test-13',
      allowPaths: ['*'],
      spendLimit: '',
      spendPeriod: 0,
      expiresAt: 0,
      status: 'ACTIVE',
      createdAt: Math.floor(Date.now() / 1000),
    });
    getSession.mockResolvedValue(null);

    renderHook(() => useVisibleAccounts());

    await waitFor(() => expect(getSession).toHaveBeenCalledWith(MASTER_ADDR, SESSION_ADDR));
    expect(convertBySessionAddresses).not.toHaveBeenCalled();
  });
});
