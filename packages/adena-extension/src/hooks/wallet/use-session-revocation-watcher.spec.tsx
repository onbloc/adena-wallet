import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { JSX } from 'react';
import React, { PropsWithChildren } from 'react';
import type { Mock } from 'vitest';

import { useSessionRevocationWatcher } from './use-session-revocation-watcher';

vi.mock('@hooks/use-context', () => ({
  useAdenaContext: vi.fn(),
  useWalletContext: vi.fn(),
}));
vi.mock('@hooks/use-current-account', () => ({ useCurrentAccount: vi.fn() }));

// shouldMarkSessionRevoked sleeps SESSION_MISSING_RECHECK_DELAY_MS (1.5s) before
// its recheck, so the revoke assertion needs a window wider than that.
const REVOKE_WAIT_TIMEOUT = 4_000;

const SESSION_ADDR = 'g1session';
const MASTER_ADDR = 'g1master';

// createdAt far in the past so the creation grace never applies.
const ACTIVE_METADATA = { status: 'ACTIVE', createdAt: 1 };

const WATCH_QUERY_KEY = ['session/revocation-watch', 'session-1'];

const makeWrapper = (): { wrapper: React.FC<PropsWithChildren>; client: QueryClient } => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: PropsWithChildren): JSX.Element => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return { wrapper: Wrapper, client };
};

describe('useSessionRevocationWatcher', () => {
  const getSession = vi.fn();
  const get = vi.fn();
  const setStatus = vi.fn(async () => undefined);

  const mockSessionAccount = (): void => {
    (useCurrentAccount as Mock).mockReturnValue({
      currentAccount: {
        id: 'session-1',
        type: 'SESSION',
        getAddress: vi.fn(async () => SESSION_ADDR),
        getMasterAddress: (): string => MASTER_ADDR,
      },
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useWalletContext as Mock).mockReturnValue({ gnoProvider: { getSession } });
    (useAdenaContext as Mock).mockReturnValue({ sessionRepository: { get, setStatus } });
  });

  it('flags REVOKED when the session is absent from chain past the grace period', async () => {
    mockSessionAccount();
    get.mockResolvedValue(ACTIVE_METADATA);
    getSession.mockResolvedValue(null);

    renderHook(() => useSessionRevocationWatcher(), { wrapper: makeWrapper().wrapper });

    await waitFor(() => expect(setStatus).toHaveBeenCalledWith(SESSION_ADDR, 'REVOKED'), {
      timeout: REVOKE_WAIT_TIMEOUT,
    });
  });

  it('does not flag a session that is still on chain', async () => {
    mockSessionAccount();
    get.mockResolvedValue(ACTIVE_METADATA);
    getSession.mockResolvedValue({ BaseSessionAccount: {} });

    renderHook(() => useSessionRevocationWatcher(), { wrapper: makeWrapper().wrapper });

    await waitFor(() => expect(getSession).toHaveBeenCalled());
    expect(setStatus).not.toHaveBeenCalled();
  });

  it('does not flag when the chain read fails', async () => {
    mockSessionAccount();
    get.mockResolvedValue(ACTIVE_METADATA);
    getSession.mockRejectedValue(new Error('network down'));

    renderHook(() => useSessionRevocationWatcher(), { wrapper: makeWrapper().wrapper });

    await waitFor(() => expect(getSession).toHaveBeenCalled());
    expect(setStatus).not.toHaveBeenCalled();
  });

  // Without a SESSIONS row there is nothing to flag (setStatus no-ops), so the
  // watcher must not poll the chain forever.
  it('never queries the chain for a session with no metadata', async () => {
    mockSessionAccount();
    get.mockResolvedValue(null);

    renderHook(() => useSessionRevocationWatcher(), { wrapper: makeWrapper().wrapper });

    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(getSession).not.toHaveBeenCalled();
    expect(setStatus).not.toHaveBeenCalled();
  });

  // 'revoked' stops the poll, so it must not be reported while the durable row
  // still says ACTIVE — the next tick has to retry the write.
  it('keeps polling when persisting the revoked status fails', async () => {
    mockSessionAccount();
    get.mockResolvedValue(ACTIVE_METADATA);
    getSession.mockResolvedValue(null);
    setStatus.mockRejectedValueOnce(new Error('storage unavailable'));

    const { wrapper, client } = makeWrapper();
    renderHook(() => useSessionRevocationWatcher(), { wrapper });

    await waitFor(() => expect(setStatus).toHaveBeenCalled(), { timeout: REVOKE_WAIT_TIMEOUT });
    // Non-terminal, so refetchInterval keeps the poll alive for the retry.
    await waitFor(() => expect(client.getQueryData(WATCH_QUERY_KEY)).toBe('unknown'), {
      timeout: REVOKE_WAIT_TIMEOUT,
    });
  });

  it('never queries the chain once already flagged REVOKED', async () => {
    mockSessionAccount();
    get.mockResolvedValue({ status: 'REVOKED', createdAt: 1 });

    renderHook(() => useSessionRevocationWatcher(), { wrapper: makeWrapper().wrapper });

    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(getSession).not.toHaveBeenCalled();
  });

  // A key imported from a session private key is an ordinary account: no
  // delegation exists on chain, so nothing should be watched.
  it('is disabled for non-session accounts', async () => {
    (useCurrentAccount as Mock).mockReturnValue({
      currentAccount: { id: 'pk-1', type: 'PRIVATE_KEY', getAddress: vi.fn() },
    });

    renderHook(() => useSessionRevocationWatcher(), { wrapper: makeWrapper().wrapper });

    await new Promise(resolve => setTimeout(resolve, 10));
    expect(get).not.toHaveBeenCalled();
    expect(getSession).not.toHaveBeenCalled();
  });
});
