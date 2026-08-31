import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, waitFor } from '@testing-library/react';
import React, { PropsWithChildren } from 'react';
import { RecoilRoot } from 'recoil';

import { makeWalletLockedQueryKey } from '@common/constants/query-key.constant';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useWallet } from '@hooks/use-wallet';

import { WalletProvider } from './wallet-provider';

// Mocked wholesale rather than with `requireActual`: the real module reaches
// the provider barrel, which pulls @adena-wallet/sdk's social-wallet stack into
// jsdom and blows up on import.
jest.mock('@hooks/use-context', () => ({
  useAdenaContext: jest.fn(),
  // Resolved lazily: requiring the provider from the factory body would run
  // into the mock while it is still being constructed.
  useWalletContext: (): unknown => {
    /* eslint-disable @typescript-eslint/no-var-requires */
    const react = require('react');
    const { WalletContext } = require('./wallet-provider');
    /* eslint-enable @typescript-eslint/no-var-requires */
    return react.useContext(WalletContext);
  },
}));

jest.mock('../gno/gno-provider', () => ({
  GnoProvider: jest.fn().mockImplementation(() => ({})),
}));

const WALLET_SERVICE_ID = 'wallet-service-id';

const makeAdenaContext = (walletService: Record<string, unknown>): Record<string, unknown> => ({
  walletService: { id: WALLET_SERVICE_ID, ...walletService },
  accountService: {
    getCurrentAccountId: jest.fn().mockResolvedValue(null),
    changeCurrentAccount: jest.fn().mockResolvedValue(true),
  },
  // An empty network list makes `initNetworkMetainfos` bail out early, so the
  // test only exercises the wallet half of the provider's bootstrap.
  chainService: { getNetworks: jest.fn().mockResolvedValue([]) },
  chainRegistry: { register: jest.fn() },
  tokenRegistry: { register: jest.fn() },
});

let initWallet: () => Promise<boolean>;
let lockedWallet: boolean | undefined;

const Probe = (): JSX.Element => {
  initWallet = useWalletContext().initWallet;
  lockedWallet = useWallet().lockedWallet;
  return <div />;
};

// Mirrors the app-wide defaults in App/app-provider: the lock-state query is
// cached for 10s and never refetches on window focus, so the provider has to
// write the fresh value back itself.
const makeWrapper = (queryClient: QueryClient): React.FC<PropsWithChildren> => {
  const Wrapper = ({ children }: PropsWithChildren): JSX.Element => (
    <RecoilRoot>
      <QueryClientProvider client={queryClient}>
        <WalletProvider>{children}</WalletProvider>
      </QueryClientProvider>
    </RecoilRoot>
  );
  Wrapper.displayName = 'WalletProviderWrapper';
  return Wrapper;
};

describe('WalletProvider lock-state cache', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    initWallet = jest.fn();
    lockedWallet = undefined;
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { staleTime: 10_000, refetchOnWindowFocus: false, retry: false },
      },
    });
  });

  it('reports the wallet as unlocked right after an unlock, without waiting for a refetch', async () => {
    const isLocked = jest.fn().mockResolvedValue(true);
    const walletService = {
      existsWallet: jest.fn().mockResolvedValue(true),
      isLocked,
      loadWallet: jest
        .fn()
        .mockResolvedValue({ accounts: [], currentAccountId: null, hasHDWallet: () => false }),
    };
    (useAdenaContext as jest.Mock).mockReturnValue(makeAdenaContext(walletService));

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
      existsWallet: jest.fn().mockResolvedValue(true),
      isLocked: jest.fn().mockResolvedValue(true),
      loadWallet: jest.fn(),
    };
    (useAdenaContext as jest.Mock).mockReturnValue(makeAdenaContext(walletService));

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
});
