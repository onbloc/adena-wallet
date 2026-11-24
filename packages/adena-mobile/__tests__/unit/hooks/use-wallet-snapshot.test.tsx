import { act, renderHook } from '@testing-library/react-native';
import React, { PropsWithChildren } from 'react';

import { AppContainer } from '../../../src/di/container';
import { ContainerProvider } from '../../../src/di/container-provider';
import { useWalletSnapshot } from '../../../src/hooks/use-wallet-snapshot';
import { useSessionStore } from '../../../src/stores/session.store';
import { createTestContainer, TEST_MNEMONIC, TEST_PASSWORD } from '../../helpers/test-container';

const wrap = (container: AppContainer) => ({ children }: PropsWithChildren) => <ContainerProvider container={container}>{children}</ContainerProvider>;

describe('useWalletSnapshot', () => {
  it('has no account or address before a wallet exists', async () => {
    const { container } = createTestContainer();
    const { result } = await renderHook(() => useWalletSnapshot(), { wrapper: wrap(container) });

    expect(result.current.account).toBeNull();
    expect(result.current.address).toBe('');
    expect(result.current.network).toEqual(container.networkService.getCurrentNetwork());
    expect(result.current.networks.length).toBeGreaterThan(0);
  });

  it('reads the current account and recomputes on revision bumps', async () => {
    const { container } = createTestContainer();
    const { result } = await renderHook(() => useWalletSnapshot(), { wrapper: wrap(container) });
    const first = result.current;

    await container.walletService.createWallet({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });
    await act(async () => useSessionStore.getState().bumpRevision());
    expect(result.current).not.toBe(first);
    expect(result.current.revision).toBe(first.revision + 1);
    expect(result.current.address).toMatch(/^g1/);
    expect(result.current.accounts).toHaveLength(1);
  });

  it('throws outside a ContainerProvider', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(renderHook(() => useWalletSnapshot())).rejects.toThrow('useContainer must be used inside ContainerProvider');
    jest.restoreAllMocks();
  });
});
