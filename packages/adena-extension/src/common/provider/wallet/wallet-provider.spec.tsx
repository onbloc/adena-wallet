import { makeWalletLockedQueryKey } from '@common/constants/query-key.constant';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useWallet } from '@hooks/use-wallet';
import { WalletState } from '@states';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react';
import { Provider as JotaiProvider, useAtomValue } from 'jotai';
import type { JSX } from 'react';
import React, { PropsWithChildren } from 'react';
import type { Mock } from 'vitest';

import { WalletContext, WalletProvider } from './wallet-provider';

// Mocked wholesale rather than with `requireActual`: the real module reaches
// the provider barrel, which pulls @adena-wallet/sdk's social-wallet stack into
// jsdom and blows up on import.
vi.mock('@hooks/use-context', () => ({
  useAdenaContext: vi.fn(),
  // Read at render time: the provider module is still loading while this
  // factory runs, so its exports cannot be touched here.
  useWalletContext: (): unknown => React.useContext(WalletContext),
}));

vi.mock('../gno/gno-provider', () => ({
  GnoProvider: vi.fn().mockImplementation(function () {
    return {};
  }),
}));

const WALLET_SERVICE_ID = 'wallet-service-id';

const makeAdenaContext = (
  walletService: Record<string, unknown>,
  currentAccountId: string | null = null,
): Record<string, unknown> => ({
  // `setCurrentWalletResolver` is registered by the provider on mount, so every
  // walletService stub needs it even when the test does not care about it.
  walletService: { id: WALLET_SERVICE_ID, setCurrentWalletResolver: vi.fn(), ...walletService },
  accountService: {
    getCurrentAccountId: vi.fn().mockResolvedValue(currentAccountId),
    changeCurrentAccount: vi.fn().mockResolvedValue(true),
  },
  // An empty network list makes `initNetworkMetainfos` bail out early, so the
  // test only exercises the wallet half of the provider's bootstrap.
  chainService: { getNetworks: vi.fn().mockResolvedValue([]) },
  chainRegistry: { register: vi.fn() },
  tokenRegistry: { register: vi.fn() },
});

let initWallet: () => Promise<boolean>;
let clearWallet: () => Promise<void>;
let lockedWallet: boolean | undefined;
let wallet: unknown;
let currentAccount: unknown;

const Probe = (): JSX.Element => {
  const context = useWalletContext();
  initWallet = context.initWallet;
  clearWallet = context.clearWallet;
  wallet = context.wallet;
  currentAccount = useAtomValue(WalletState.currentAccount);
  lockedWallet = useWallet().lockedWallet;
  return <div />;
};

// Mirrors the app-wide defaults in App/app-provider: the lock-state query is
// cached for 10s and never refetches on window focus, so the provider has to
// write the fresh value back itself.
const makeWrapper = (queryClient: QueryClient): React.FC<PropsWithChildren> => {
  const Wrapper = ({ children }: PropsWithChildren): JSX.Element => (
    <JotaiProvider>
      <QueryClientProvider client={queryClient}>
        <WalletProvider>{children}</WalletProvider>
      </QueryClientProvider>
    </JotaiProvider>
  );
  Wrapper.displayName = 'WalletProviderWrapper';
  return Wrapper;
};

describe('WalletProvider lock-state cache', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    initWallet = vi.fn();
    clearWallet = vi.fn();
    lockedWallet = undefined;
    wallet = undefined;
    currentAccount = undefined;
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { staleTime: 10_000, refetchOnWindowFocus: false, retry: false },
      },
    });
  });

  it('reports the wallet as unlocked right after an unlock, without waiting for a refetch', async () => {
    const isLocked = vi.fn().mockResolvedValue(true);
    const walletService = {
      existsWallet: vi.fn().mockResolvedValue(true),
      isLocked,
      loadWallet: vi
        .fn()
        .mockResolvedValue({ accounts: [], currentAccountId: null, hasHDWallet: () => false }),
    };
    (useAdenaContext as Mock).mockReturnValue(makeAdenaContext(walletService));

    const Wrapper = makeWrapper(queryClient);
    render(
      <Wrapper>
        <Probe />
      </Wrapper>,
    );

    await waitFor(() => expect(lockedWallet).toBe(true));

    // Auto-lock invalidates the query, so the cache holds `true` when the user
    // reaches the Login screen. Unlocking runs `initWallet` again.
    isLocked.mockResolvedValue(false);
    await act(async () => {
      await initWallet();
    });

    await waitFor(() => expect(lockedWallet).toBe(false));
  });

  it('keeps the cached lock state authoritative while the wallet is locked', async () => {
    const walletService = {
      existsWallet: vi.fn().mockResolvedValue(true),
      isLocked: vi.fn().mockResolvedValue(true),
      loadWallet: vi.fn(),
    };
    (useAdenaContext as Mock).mockReturnValue(makeAdenaContext(walletService));

    // Pre-seed a stale `false`, as if the wallet had been unlocked earlier.
    queryClient.setQueryData(makeWalletLockedQueryKey(WALLET_SERVICE_ID), false);

    const Wrapper = makeWrapper(queryClient);
    render(
      <Wrapper>
        <Probe />
      </Wrapper>,
    );

    await waitFor(() => expect(lockedWallet).toBe(true));
  });

  it('drops the in-memory wallet and current account when the wallet is cleared', async () => {
    const account = { id: 'account-1' };
    const walletService = {
      existsWallet: vi.fn().mockResolvedValue(true),
      isLocked: vi.fn().mockResolvedValue(false),
      loadWallet: vi.fn().mockResolvedValue({
        accounts: [account],
        currentAccountId: null,
        hasHDWallet: () => false,
      }),
    };
    (useAdenaContext as Mock).mockReturnValue(makeAdenaContext(walletService, account.id));

    const Wrapper = makeWrapper(queryClient);
    render(
      <Wrapper>
        <Probe />
      </Wrapper>,
    );

    await waitFor(() => expect(currentAccount).toEqual(account));
    expect(wallet).not.toBeNull();

    await act(async () => {
      await clearWallet();
    });

    expect(wallet).toBeNull();
    expect(currentAccount).toBeNull();
  });
});
