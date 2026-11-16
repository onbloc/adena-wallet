import { renderHook } from '@testing-library/react';
import { Account } from 'adena-module';
import type { Mock } from 'vitest';

import { useLoadAccounts } from './use-load-accounts';
import { useNetwork } from './use-network';
import { useVisibleAccounts } from './use-visible-accounts';

vi.mock('./use-load-accounts', () => ({
  useLoadAccounts: vi.fn(),
}));

vi.mock('./use-network', () => ({
  useNetwork: vi.fn(),
}));

const useLoadAccountsMock = useLoadAccounts as Mock;
const useNetworkMock = useNetwork as Mock;

const makeSessionAccount = (chainId?: string): Account =>
  ({
    id: `session-${chainId ?? 'legacy'}`,
    index: 1,
    type: 'SESSION',
    name: 'Session 1',
    keyringId: 'keyring-1',
    publicKey: new Uint8Array(33),
    sessionConfig: {
      masterAddress: 'g1master',
      chainId,
      status: 'ACTIVE',
    },
    getAddress: vi.fn(async () => 'g1session'),
    getMasterAddress: vi.fn(() => 'g1master'),
    toData: vi.fn(),
  }) as unknown as Account;

const makeSeedAccount = (): Account =>
  ({
    id: 'seed-1',
    index: 0,
    type: 'HD_WALLET',
    name: 'Account 1',
  }) as unknown as Account;

describe('useVisibleAccounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useNetworkMock.mockReturnValue({ currentNetwork: { chainId: 'test-13', addressPrefix: 'g' } });
  });

  it('keeps sessions issued on the current chain and hides the others', () => {
    const seed = makeSeedAccount();
    const current = makeSessionAccount('test-13');
    const other = makeSessionAccount('portal-loop');
    useLoadAccountsMock.mockReturnValue({ accounts: [seed, current, other] });

    const { result } = renderHook(() => useVisibleAccounts());

    expect(result.current).toEqual([seed, current]);
  });

  // Sessions stored before chainId was persisted must not be silently hidden.
  it('keeps sessions without a chainId', () => {
    const legacy = makeSessionAccount(undefined);
    useLoadAccountsMock.mockReturnValue({ accounts: [legacy] });

    const { result } = renderHook(() => useVisibleAccounts());

    expect(result.current).toEqual([legacy]);
  });

  it('returns every account while the network is not resolved', () => {
    const other = makeSessionAccount('portal-loop');
    useLoadAccountsMock.mockReturnValue({ accounts: [other] });
    useNetworkMock.mockReturnValue({ currentNetwork: undefined });

    const { result } = renderHook(() => useVisibleAccounts());

    expect(result.current).toEqual([other]);
  });
});
