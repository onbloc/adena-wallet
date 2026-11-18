import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { Account } from 'adena-module';
import type { JSX } from 'react';
import React, { PropsWithChildren } from 'react';
import type { Mock } from 'vitest';

import { useAccountListInfos } from './use-account-list-infos';
import { useAccountName } from './use-account-name';
import { useAccountNativeBalanceMap } from './use-account-native-balance-map';
import { useChain } from './use-chain';
import { useMasterAccountBadgeMap } from './use-master-account-badge-map';

vi.mock('./use-account-name', () => ({ useAccountName: vi.fn() }));
vi.mock('./use-chain', () => ({ useChain: vi.fn() }));
vi.mock('./use-master-account-badge-map', () => ({ useMasterAccountBadgeMap: vi.fn() }));
vi.mock('./use-account-native-balance-map', () => ({ useAccountNativeBalanceMap: vi.fn() }));

const makeWrapper = (): React.FC<PropsWithChildren> => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: PropsWithChildren): JSX.Element => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'QueryWrapper';
  return Wrapper;
};

describe('useAccountListInfos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAccountName as Mock).mockReturnValue({ accountNames: {} });
    (useChain as Mock).mockReturnValue({ bech32Prefix: 'g' });
    (useMasterAccountBadgeMap as Mock).mockReturnValue({});
    (useAccountNativeBalanceMap as Mock).mockReturnValue({});
  });

  it('lists a regular account under its own address', async () => {
    const account = {
      id: 'account-1',
      name: 'Account 1',
      type: 'HD_WALLET',
      getAddress: vi.fn(async (prefix: string) => `${prefix}1self`),
    } as unknown as Account;

    const { result } = renderHook(() => useAccountListInfos([account]), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data?.[0].address).toBe('g1self');
  });

  // The session address holds no balance and cannot receive deposits, so the
  // row must show — and copy — the master address next to the master balance.
  it('lists a SessionAccount under its master address', async () => {
    const getAddress = vi.fn();
    const account = {
      id: 'session-1',
      name: 'Session 1',
      type: 'SESSION',
      getMasterAddress: (): string => 'g1master',
      getAddress,
    } as unknown as Account;

    const { result } = renderHook(() => useAccountListInfos([account]), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data?.[0].address).toBe('g1master');
    expect(getAddress).not.toHaveBeenCalled();
  });
});
