import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { Account } from 'adena-module';
import React, { PropsWithChildren } from 'react';

import { useAccountListInfos } from './use-account-list-infos';
import { useAccountName } from './use-account-name';
import { useChain } from './use-chain';
import { useMasterAccountBadgeMap } from './use-master-account-badge-map';
import { useTokenBalance } from './use-token-balance';

jest.mock('./use-account-name', () => ({ useAccountName: jest.fn() }));
jest.mock('./use-chain', () => ({ useChain: jest.fn() }));
jest.mock('./use-master-account-badge-map', () => ({ useMasterAccountBadgeMap: jest.fn() }));
jest.mock('./use-token-balance', () => ({ useTokenBalance: jest.fn() }));

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
    jest.clearAllMocks();
    (useAccountName as jest.Mock).mockReturnValue({ accountNames: {} });
    (useChain as jest.Mock).mockReturnValue({ bech32Prefix: 'g' });
    (useMasterAccountBadgeMap as jest.Mock).mockReturnValue({});
    (useTokenBalance as jest.Mock).mockReturnValue({ accountNativeBalanceMap: {} });
  });

  it('lists a regular account under its own address', async () => {
    const account = {
      id: 'account-1',
      name: 'Account 1',
      type: 'HD_WALLET',
      getAddress: jest.fn(async (prefix: string) => `${prefix}1self`),
    } as unknown as Account;

    const { result } = renderHook(() => useAccountListInfos([account]), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.data?.[0].address).toBe('g1self');
  });

  // The session address holds no balance and cannot receive deposits, so the
  // row must show — and copy — the master address next to the master balance.
  it('lists a SessionAccount under its master address', async () => {
    const getAddress = jest.fn();
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
