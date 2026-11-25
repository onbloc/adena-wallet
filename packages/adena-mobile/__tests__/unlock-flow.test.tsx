import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React, { ReactElement } from 'react';
import { AppState, AppStateStatus, Text } from 'react-native';

import { AppShell } from '../src/app/app-shell';
import { APP_CONFIG } from '../src/config/app';
import { AppError, AppErrorCode } from '../src/core/errors';
import { BiometryKind } from '../src/security/secure-store';
import { SessionStatus, useSessionStore } from '../src/stores/session.store';
import { createWrapper } from './helpers/query-wrapper';
import { wrapPage } from './unit/components/pages/render-page';

// Stand-ins for the unlocked and onboarding roots; the locked stack, splash and unlock screens are real.
function MockMainTabs(): ReactElement {
  return <Text>wallet home</Text>;
}

function MockWelcomeScreen(): ReactElement {
  return <Text>welcome</Text>;
}

jest.mock('../src/navigation/main-tabs', () => ({ MainTabs: MockMainTabs }));
jest.mock('../src/containers/onboarding/welcome-screen', () => ({ WelcomeScreen: MockWelcomeScreen }));

describe('launch and lock flow', () => {
  const walletService = {
    getStatus: jest.fn(),
    lock: jest.fn(),
    unlock: jest.fn(),
    unlockWithBiometrics: jest.fn(),
    getBiometryKind: jest.fn(),
    isBiometricUnlockEnabled: jest.fn(),
  };
  let appStateListeners: ((state: AppStateStatus) => void)[] = [];

  const launch = () => {
    const { Wrapper } = createWrapper({ walletService });

    return render(wrapPage(<Wrapper><AppShell /></Wrapper>));
  };

  const changeAppState = (state: AppStateStatus) => act(async () => {
    appStateListeners.forEach(listener => listener(state));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    appStateListeners = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      appStateListeners.push(handler as (state: AppStateStatus) => void);

      return { remove: jest.fn() } as never;
    });
    walletService.getStatus.mockResolvedValue(SessionStatus.LOCKED);
    walletService.getBiometryKind.mockResolvedValue(BiometryKind.FACE);
    walletService.isBiometricUnlockEnabled.mockResolvedValue(true);
    walletService.unlockWithBiometrics.mockResolvedValue(undefined);
    useSessionStore.setState({ status: SessionStatus.BOOTING });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('opens the wallet from the splash without showing the unlock screen', async () => {
    await launch();

    expect(await screen.findByText('wallet home')).toBeTruthy();
    expect(walletService.unlockWithBiometrics).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('unlock-password')).toBeNull();
  });

  it('falls back to the password screen on cancel and does not prompt again', async () => {
    walletService.unlockWithBiometrics.mockRejectedValue(new AppError(AppErrorCode.BIOMETRICS_CANCELED));
    await launch();

    expect(await screen.findByTestId('unlock-password')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Use Face ID' })).toBeTruthy();
    expect(walletService.unlockWithBiometrics).toHaveBeenCalledTimes(1);

    walletService.unlock.mockResolvedValue(undefined);
    await fireEvent.changeText(screen.getByTestId('unlock-password'), 'correct horse battery');
    await fireEvent.press(screen.getByTestId('unlock-submit'));
    expect(await screen.findByText('wallet home')).toBeTruthy();
  });

  it('shows the lockout reason on the password screen', async () => {
    walletService.unlockWithBiometrics.mockRejectedValue(new AppError(AppErrorCode.BIOMETRICS_UNAVAILABLE));
    await launch();

    expect(await screen.findByText('Face ID is unavailable. Enter your password.')).toBeTruthy();
  });

  it('goes to the password screen when biometrics are off', async () => {
    walletService.isBiometricUnlockEnabled.mockResolvedValue(false);
    await launch();

    expect(await screen.findByTestId('unlock-password')).toBeTruthy();
    expect(walletService.unlockWithBiometrics).not.toHaveBeenCalled();
  });

  it('asks for biometrics again after an auto-lock in the background', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);

    await launch();
    expect(await screen.findByText('wallet home')).toBeTruthy();

    await changeAppState('background');
    now.mockReturnValue(1_000_000 + APP_CONFIG.autoLockMs + 1);
    await changeAppState('active');

    expect(walletService.lock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(walletService.unlockWithBiometrics).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('wallet home')).toBeTruthy();
    expect(useSessionStore.getState().status).toBe(SessionStatus.UNLOCKED);
  });

  it('starts onboarding without biometrics when there is no wallet', async () => {
    walletService.getStatus.mockResolvedValue(SessionStatus.EMPTY);
    await launch();

    expect(await screen.findByText('welcome')).toBeTruthy();
    expect(walletService.unlockWithBiometrics).not.toHaveBeenCalled();
  });
});
