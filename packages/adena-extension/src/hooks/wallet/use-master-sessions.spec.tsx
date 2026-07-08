import React, { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useMasterSessions } from './use-master-sessions';

jest.mock('@hooks/use-context', () => ({
  useAdenaContext: jest.fn(),
  useWalletContext: jest.fn(),
}));

describe('useMasterSessions', () => {
  const useAdenaContextMock = useAdenaContext as jest.Mock;
  const useWalletContextMock = useWalletContext as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stops loading when the master account has no sessions', async () => {
    const getSessions = jest.fn().mockResolvedValue([]);
    const getAll = jest.fn().mockResolvedValue({});

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
