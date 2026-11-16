import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { JSX } from 'react';
import React, { PropsWithChildren } from 'react';
import type { Mock } from 'vitest';

import { useMasterSessions } from './use-master-sessions';

vi.mock('@hooks/use-context', () => ({
  useAdenaContext: vi.fn(),
  useWalletContext: vi.fn(),
}));

describe('useMasterSessions', () => {
  const useAdenaContextMock = useAdenaContext as Mock;
  const useWalletContextMock = useWalletContext as Mock;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stops loading when the master account has no sessions', async () => {
    const getSessions = vi.fn().mockResolvedValue([]);
    const getAll = vi.fn().mockResolvedValue({});

    useWalletContextMock.mockReturnValue({
      gnoProvider: { getSessions },
      wallet: { accounts: [] },
    });
    useAdenaContextMock.mockReturnValue({
      sessionRepository: { getAll },
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: PropsWithChildren): JSX.Element => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () => useMasterSessions('g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5'),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.entries).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(getSessions).toHaveBeenCalledTimes(1);
  });
});
