import { WalletState } from '@states';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { createStore, Provider as JotaiProvider } from 'jotai';
import type { JSX } from 'react';
import React, { PropsWithChildren } from 'react';
import type { Mock } from 'vitest';

import { useChain } from './use-chain';
import { useAdenaContext, useWalletContext } from './use-context';
import { useCurrentAccount } from './use-current-account';
import { useEvent } from './use-event';
import { useNetwork } from './use-network';
import { useSessions } from './use-sessions';

vi.mock('./use-chain', () => ({ useChain: vi.fn() }));
vi.mock('./use-context', () => ({ useAdenaContext: vi.fn(), useWalletContext: vi.fn() }));
vi.mock('./use-event', () => ({ useEvent: vi.fn() }));
vi.mock('./use-network', () => ({ useNetwork: vi.fn() }));
vi.mock('./use-sessions', () => ({ useSessions: vi.fn() }));

const SESSION_ADDR = 'g1session';
const MASTER_ADDR = 'g1master';

const sessionAccount = {
  id: 'session-1',
  type: 'SESSION',
  getAddress: vi.fn(async () => SESSION_ADDR),
  getMasterAddress: (): string => MASTER_ADDR,
};

const makeWrapper = (): React.FC<PropsWithChildren> => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const store = createStore();
  store.set(WalletState.currentAccount, sessionAccount as never);
  const Wrapper = ({ children }: PropsWithChildren): JSX.Element => (
    <JotaiProvider store={store}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </JotaiProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
};

const mockSessions = (status: string): void => {
  (useSessions as Mock).mockReturnValue({
    sessions: [{ sessionAddr: SESSION_ADDR, status }],
  });
};

describe('useCurrentAccount address split for session accounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useChain as Mock).mockReturnValue({ bech32Prefix: 'g' });
    (useAdenaContext as Mock).mockReturnValue({ accountService: {} });
    (useWalletContext as Mock).mockReturnValue({ wallet: null });
    (useNetwork as Mock).mockReturnValue({ currentNetwork: { chainId: 'test-13' } });
    (useEvent as Mock).mockReturnValue({ dispatchEvent: vi.fn() });
  });

  it('an ACTIVE session funds from, and shows the balance of, the master', async () => {
    mockSessions('ACTIVE');

    const { result } = renderHook(() => useCurrentAccount(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.currentFundingAddress).toBe(MASTER_ADDR));
    expect(result.current.currentBalanceAddress).toBe(MASTER_ADDR);
    expect(result.current.currentAddress).toBe(SESSION_ADDR);
  });

  // A revoked session can no longer spend master funds, so only its displayed
  // balance moves to the session key. Deposits and from_address stay on master.
  it('a REVOKED session keeps funding on master but shows the session balance', async () => {
    mockSessions('REVOKED');

    const { result } = renderHook(() => useCurrentAccount(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.currentBalanceAddress).toBe(SESSION_ADDR));
    expect(result.current.currentFundingAddress).toBe(MASTER_ADDR);
  });
});
