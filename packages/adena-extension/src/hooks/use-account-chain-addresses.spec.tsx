import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { JSX } from 'react';
import React, { PropsWithChildren } from 'react';
import type { Mock } from 'vitest';

import { useAccountChainAddresses } from './use-account-chain-addresses';

vi.mock('@hooks/use-context', () => ({
  useAdenaContext: vi.fn(),
}));
vi.mock('@hooks/use-current-account', () => ({
  useCurrentAccount: vi.fn(),
}));

const GNO_PROFILE = {
  id: 'gnoland-1',
  chainGroup: 'gno',
  displayName: 'Gno.land',
  chainIconUrl: '',
};
const ATOMONE_PROFILE = {
  id: 'atomone-1',
  chainGroup: 'atomone',
  displayName: 'AtomOne',
  chainIconUrl: '',
};

const chainRegistry = {
  list: (): unknown[] => [GNO_PROFILE, ATOMONE_PROFILE],
  getDefault: (group: string): unknown => (group === 'gno' ? GNO_PROFILE : ATOMONE_PROFILE),
  getChain: (group: string): unknown =>
    group === 'gno' ? { bech32Prefix: 'g' } : { bech32Prefix: 'atone' },
};

const makeWrapper = (): React.FC<PropsWithChildren> => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: PropsWithChildren): JSX.Element => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useAccountChainAddresses', () => {
  const useAdenaContextMock = useAdenaContext as Mock;
  const useCurrentAccountMock = useCurrentAccount as Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    useAdenaContextMock.mockReturnValue({ chainRegistry });
  });

  it('returns one entry per chain group for a regular account', async () => {
    useCurrentAccountMock.mockReturnValue({
      currentAccount: {
        id: 'account-1',
        type: 'HD_WALLET',
        getAddress: vi.fn(async (prefix: string) => `${prefix}1addr`),
      },
    });

    const { result } = renderHook(() => useAccountChainAddresses(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current).toHaveLength(2));
    expect(result.current.map(entry => entry.chain.chainGroup)).toEqual(['gno', 'atomone']);
    expect(result.current.map(entry => entry.address)).toEqual(['g1addr', 'atone1addr']);
  });

  it('SessionAccount exposes only the Gno master address and hides AtomOne', async () => {
    // A session address can never receive deposits, so it must never surface as
    // a receivable address — and a session has no key material for AtomOne.
    const getAddress = vi.fn();
    useCurrentAccountMock.mockReturnValue({
      currentAccount: {
        id: 'session-1',
        type: 'SESSION',
        getMasterAddress: (): string => 'g1master',
        getAddress,
      },
    });

    const { result } = renderHook(() => useAccountChainAddresses(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0].chain.chainGroup).toBe('gno');
    expect(result.current[0].address).toBe('g1master');
    expect(getAddress).not.toHaveBeenCalled();
  });
});
