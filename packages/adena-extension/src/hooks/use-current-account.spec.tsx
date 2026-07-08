import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React, { PropsWithChildren } from 'react';
import { RecoilRoot } from 'recoil';

import { WalletState } from '@states';
import { useChain } from './use-chain';
import { useAdenaContext, useWalletContext } from './use-context';
import { useCurrentAccount } from './use-current-account';
import { useEvent } from './use-event';
import { useNetwork } from './use-network';
import { useSessions } from './use-sessions';

jest.mock('./use-chain', () => ({ useChain: jest.fn() }));
jest.mock('./use-context', () => ({ useAdenaContext: jest.fn(), useWalletContext: jest.fn() }));
jest.mock('./use-event', () => ({ useEvent: jest.fn() }));
jest.mock('./use-network', () => ({ useNetwork: jest.fn() }));
jest.mock('./use-sessions', () => ({ useSessions: jest.fn() }));

const SESSION_ADDR = 'g1session';
const MASTER_ADDR = 'g1master';

const sessionAccount = {
  id: 'session-1',
  type: 'SESSION',
  getAddress: jest.fn(async () => SESSION_ADDR),
  getMasterAddress: (): string => MASTER_ADDR,
};

const makeWrapper = (): React.FC<PropsWithChildren> => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: PropsWithChildren): JSX.Element => (
    <RecoilRoot
      initializeState={({ set }): void => {
        set(WalletState.currentAccount, sessionAccount as never);
      }}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </RecoilRoot>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
};

const mockSessions = (status: string): void => {
  (useSessions as jest.Mock).mockReturnValue({
    sessions: [{ sessionAddr: SESSION_ADDR, status }],
  });
};

describe('useCurrentAccount address split for session accounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useChain as jest.Mock).mockReturnValue({ bech32Prefix: 'g' });
    (useAdenaContext as jest.Mock).mockReturnValue({ accountService: {} });
    (useWalletContext as jest.Mock).mockReturnValue({ wallet: null });
    (useNetwork as jest.Mock).mockReturnValue({ currentNetwork: { chainId: 'test-13' } });
    (useEvent as jest.Mock).mockReturnValue({ dispatchEvent: jest.fn() });
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
