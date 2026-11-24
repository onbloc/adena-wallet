import { act, renderHook } from '@testing-library/react-native';

import { useFactoryReset } from '../../../src/hooks/use-factory-reset';
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
  });

  it('clears caches and client stores and returns to onboarding', async () => {
    resetAll.mockResolvedValue(undefined);
    const { client, hook } = setup();
    const { result } = await hook;

    await act(() => result.current());

    expect(client.getQueryData(['secret'])).toBeUndefined();
    expect(useOnboardingStore.getState().mnemonic).toBeNull();
    expect(useToastStore.getState().toast).toBeNull();
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
