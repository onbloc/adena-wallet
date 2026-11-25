import { act, renderHook } from '@testing-library/react-native';

import { useFactoryReset } from '../../../src/hooks/use-factory-reset';
import { useDappRequestStore } from '../../../src/stores/dapp-request.store';
import { useOnboardingStore } from '../../../src/stores/onboarding.store';
import { SessionStatus, useSessionStore } from '../../../src/stores/session.store';
import { useToastStore } from '../../../src/stores/toast.store';
import { createWrapper } from '../../helpers/query-wrapper';

describe('useFactoryReset', () => {
  const resetAll = jest.fn();
  const getStatus = jest.fn();

  const setup = () => {
    const { Wrapper, client } = createWrapper({ appResetService: { resetAll }, walletService: { getStatus } });

    client.setQueryData(['secret'], 'cached');
    return { client, hook: renderHook(() => useFactoryReset(), { wrapper: Wrapper }) };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useSessionStore.setState({ status: SessionStatus.UNLOCKED, revision: 0 });
    useOnboardingStore.setState({ mnemonic: 'abandon about' });
    useToastStore.getState().show('Copied');
    useDappRequestStore.setState({ queue: ['adena://request?payload=a'], inFlight: true });
  });

  it('clears caches and client stores and returns to onboarding', async () => {
    resetAll.mockResolvedValue(undefined);
    const { client, hook } = setup();
    const { result } = await hook;

    await act(() => result.current());

    expect(client.getQueryData(['secret'])).toBeUndefined();
    expect(useOnboardingStore.getState().mnemonic).toBeNull();
    expect(useToastStore.getState().toast).toBeNull();
    expect(useDappRequestStore.getState()).toMatchObject({ queue: [], active: null, inFlight: false });
    expect(useSessionStore.getState()).toMatchObject({ status: SessionStatus.EMPTY, revision: 1 });
  });

  it('follows the stored state when the reset fails part way', async () => {
    resetAll.mockRejectedValue(new Error('Keychain locked'));
    getStatus.mockResolvedValue(SessionStatus.LOCKED);
    const { client, hook } = setup();
    const { result } = await hook;

    await act(async () => {
      await expect(result.current()).rejects.toThrow('Keychain locked');
    });

    expect(client.getQueryData(['secret'])).toBeUndefined();
    expect(useSessionStore.getState().status).toBe(SessionStatus.LOCKED);
    // Started unlocked: the reset screen unmounts with the navigator, so the toast carries the error.
    expect(useToastStore.getState().toast).toMatchObject({ tone: 'error', message: 'Reset failed: Keychain locked' });
  });

  it('leaves the error to the reset screen when the navigator stays', async () => {
    useSessionStore.setState({ status: SessionStatus.LOCKED });
    resetAll.mockRejectedValue(new Error('Keychain locked'));
    getStatus.mockResolvedValue(SessionStatus.LOCKED);
    const { result } = await setup().hook;

    await act(async () => {
      await expect(result.current()).rejects.toThrow('Keychain locked');
    });

    expect(useToastStore.getState().toast?.message).toBe('Copied');
  });

  it('lands on onboarding when the wallet is already gone, and locks when the status is unreadable', async () => {
    resetAll.mockRejectedValue(new Error('Storage failed'));
    getStatus.mockResolvedValueOnce(SessionStatus.EMPTY).mockRejectedValueOnce(new Error('Keychain locked'));
    const { result } = await setup().hook;

    await act(async () => {
      await expect(result.current()).rejects.toThrow('Storage failed');
    });
    expect(useSessionStore.getState().status).toBe(SessionStatus.EMPTY);

    useSessionStore.setState({ status: SessionStatus.UNLOCKED });
    await act(async () => {
      await expect(result.current()).rejects.toThrow('Storage failed');
    });
    expect(useSessionStore.getState().status).toBe(SessionStatus.LOCKED);
  });
});
