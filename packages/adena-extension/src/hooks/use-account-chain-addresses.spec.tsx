import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React, { PropsWithChildren } from 'react';

import { useAdenaContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useAccountChainAddresses } from './use-account-chain-addresses';

jest.mock('@hooks/use-context', () => ({
  useAdenaContext: jest.fn(),
}));
jest.mock('@hooks/use-current-account', () => ({
  useCurrentAccount: jest.fn(),
}));

const GNO_PROFILE = {
  id: 'gnoland1',
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
  getDefault: (group: string): unknown =>
    group === 'gno' ? GNO_PROFILE : ATOMONE_PROFILE,
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
  const useAdenaContextMock = useAdenaContext as jest.Mock;
  const useCurrentAccountMock = useCurrentAccount as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    useAdenaContextMock.mockReturnValue({ chainRegistry });
  });

  it('returns one entry per chain group for a regular account', async () => {
    useCurrentAccountMock.mockReturnValue({
      currentAccount: {
        id: 'account-1',
        type: 'HD_WALLET',
        getAddress: jest.fn(async (prefix: string) => `${prefix}1addr`),
      },
    });

    const { result } = renderHook(() => useAccountChainAddresses(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current).toHaveLength(2));
    expect(result.current.map((entry) => entry.chain.chainGroup)).toEqual(['gno', 'atomone']);
    expect(result.current.map((entry) => entry.address)).toEqual(['g1addr', 'atone1addr']);
  });

  it('SessionAccount exposes only the Gno master address and hides AtomOne', async () => {
    // A session address can never receive deposits, so it must never surface as
    // a receivable address — and a session has no key material for AtomOne.
    const getAddress = jest.fn();
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
