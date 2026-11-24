import { QueryClient } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert, AlertButton } from 'react-native';

import App from '../../../src/app/app';
import { AppError, AppErrorCode } from '../../../src/core/errors';
import { resetNativeGeneralStorage } from '../../../src/di/create-native-container';
import { useAutoLock } from '../../../src/hooks/use-auto-lock';
import { useDeepLinkHandler } from '../../../src/hooks/use-deep-link-handler';
import { useNativeContainerQuery } from '../../../src/queries/boot.queries';
import { SessionStatus, useSessionStore } from '../../../src/stores/session.store';

const mockNavigator = { crash: false };
const recordActivity = jest.fn();

jest.mock('../../../src/queries/query-client', () => {
  const { QueryClient: Client } = jest.requireActual('@tanstack/react-query');
  const clients: QueryClient[] = [];

  return {
    clients,
    createQueryClient: () => {
      const client = new Client({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });

      clients.push(client);
      return client;
    },
  };
});
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context/jest/mock').default);
jest.mock('../../../src/queries/boot.queries', () => ({ useNativeContainerQuery: jest.fn() }));
jest.mock('../../../src/di/create-native-container', () => ({ resetNativeGeneralStorage: jest.fn() }));
jest.mock('../../../src/hooks/use-auto-lock', () => ({ useAutoLock: jest.fn() }));
jest.mock('../../../src/hooks/use-deep-link-handler', () => ({ useDeepLinkHandler: jest.fn() }));
jest.mock('../../../src/navigation/root-navigator', () => {
  const { createNativeStackNavigator } = jest.requireActual('@react-navigation/native-stack');
  const { Text: RNText } = jest.requireActual('react-native');
  const Stack = createNativeStackNavigator();
  const Home = () => {
    if (mockNavigator.crash) {
      throw new Error('screen crashed');
    }

    return <RNText>Home screen</RNText>;
  };

  return { RootNavigator: () => <Stack.Navigator><Stack.Screen name='Home' component={Home} /></Stack.Navigator> };
});

const boot = (overrides: object) => ({ data: undefined, isError: false, error: null, refetch: jest.fn(), ...overrides });

describe('App', () => {
  const getStatus = jest.fn();
  const lock = jest.fn();
  const container = { walletService: { getStatus, lock }, hapticsService: { play: jest.fn() } };

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigator.crash = false;
    getStatus.mockResolvedValue(SessionStatus.LOCKED);
    (useAutoLock as jest.Mock).mockReturnValue(recordActivity);
    useSessionStore.setState({ status: SessionStatus.BOOTING });
    (jest.requireMock('../../../src/queries/query-client').clients as QueryClient[]).forEach(client => client.clear());
  });

  it('renders nothing while the container boots', async () => {
    (useNativeContainerQuery as jest.Mock).mockReturnValue(boot({}));
    await render(<App />);
    expect(screen.queryByText(/./)).toBeNull();
  });

  it('hydrates the session, reports navigation readiness and records touches', async () => {
    (useNativeContainerQuery as jest.Mock).mockReturnValue(boot({ data: container }));
    const { root } = await render(<App />);

    expect(await screen.findByText('Home screen')).toBeTruthy();
    await waitFor(() => expect(useSessionStore.getState().status).toBe(SessionStatus.LOCKED));
    await waitFor(() => expect(useDeepLinkHandler).toHaveBeenLastCalledWith(true));
    expect(useDeepLinkHandler).toHaveBeenCalledWith(false);
    await fireEvent(root!, 'touchStart');
    expect(recordActivity).toHaveBeenCalled();
  });

  it('shows a generic boot failure and retries', async () => {
    const refetch = jest.fn();

    (useNativeContainerQuery as jest.Mock).mockReturnValue(boot({ isError: true, error: new Error('Keystore missing'), refetch }));
    await render(<App />);
    expect(screen.getByText('Adena could not start')).toBeTruthy();
    expect(screen.getByText('Keystore missing')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('stringifies a non-Error boot failure', async () => {
    (useNativeContainerQuery as jest.Mock).mockReturnValue(boot({ isError: true, error: 'weird' }));
    await render(<App />);
    expect(screen.getByText('weird')).toBeTruthy();
  });

  it('resets unreadable storage after confirmation, then retries', async () => {
    const refetch = jest.fn();
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    (resetNativeGeneralStorage as jest.Mock).mockResolvedValue(undefined);
    (useNativeContainerQuery as jest.Mock).mockReturnValue(boot({
      isError: true,
      error: new AppError(AppErrorCode.STORAGE_UNREADABLE, 'Storage is corrupted.'),
      refetch,
    }));
    await render(<App />);
    expect(screen.getByText('App data cannot be read')).toBeTruthy();
    expect(screen.getByText(/Storage is corrupted\. Adena did not start over/)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Reset app data' }));
    const buttons = alert.mock.calls[0][2] as AlertButton[];

    expect(buttons.map(button => button.text)).toEqual(['Cancel', 'Reset']);
    await act(async () => buttons[1].onPress?.());
    expect(resetNativeGeneralStorage).toHaveBeenCalled();
    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(2));
  });

  it('shows the reset failure in place of the boot error', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    (resetNativeGeneralStorage as jest.Mock).mockRejectedValue(new Error('Keychain write failed'));
    (useNativeContainerQuery as jest.Mock).mockReturnValue(boot({
      isError: true,
      error: new AppError(AppErrorCode.STORAGE_UNREADABLE, 'Unreadable.'),
    }));
    await render(<App />);
    await fireEvent.press(screen.getByRole('button', { name: 'Reset app data' }));
    await act(async () => (alert.mock.calls[0][2] as AlertButton[])[1].onPress?.());
    expect(await screen.findByText('Keychain write failed')).toBeTruthy();
    expect(screen.getByText('Adena could not start')).toBeTruthy();
  });

  it('contains a crashing screen and reloads it', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    mockNavigator.crash = true;
    (useNativeContainerQuery as jest.Mock).mockReturnValue(boot({ data: container }));
    await render(<App />);
    expect(await screen.findByText('Something went wrong')).toBeTruthy();
    expect(lock).toHaveBeenCalled();

    mockNavigator.crash = false;
    await fireEvent.press(screen.getByRole('button', { name: 'Reload' }));
    expect(await screen.findByText('Home screen')).toBeTruthy();
  });
});
