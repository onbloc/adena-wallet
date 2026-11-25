import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { UnlockScreen } from '../../../src/containers/unlock-screen';
import { AppError, AppErrorCode, BIOMETRICS_INVALIDATED_MESSAGE } from '../../../src/core/errors';
import { BiometryKind } from '../../../src/security/secure-store';
import { SessionStatus, useSessionStore } from '../../../src/stores/session.store';
import { focusedTestIds, focusMock } from '../../helpers/focus';
import { createWrapper } from '../../helpers/query-wrapper';
import { wrapPage } from '../components/pages/render-page';

type UnlockProps = Parameters<typeof UnlockScreen>[0];

const deferred = () => {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });

  return { promise, resolve };
};

describe('UnlockScreen', () => {
  const walletService = {
    unlock: jest.fn(),
    unlockWithBiometrics: jest.fn(),
    getBiometryKind: jest.fn(),
    isBiometricUnlockEnabled: jest.fn(),
    disableBiometricUnlock: jest.fn(),
  };
  const setup = (params?: { error?: string }) => {
    const { Wrapper } = createWrapper({ walletService });
    const props = { navigation: { navigate: jest.fn() }, route: { key: 'Unlock', name: 'Unlock', params } } as unknown as UnlockProps;

    return render(wrapPage(<Wrapper><UnlockScreen {...props} /></Wrapper>));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    walletService.getBiometryKind.mockResolvedValue(BiometryKind.FACE);
    walletService.isBiometricUnlockEnabled.mockResolvedValue(true);
    walletService.unlockWithBiometrics.mockRejectedValue(new AppError(AppErrorCode.BIOMETRICS_CANCELED));
    walletService.disableBiometricUnlock.mockResolvedValue(undefined);
    useSessionStore.setState({ status: SessionStatus.LOCKED });
    focusMock().mockClear();
  });

  // The splash owns the automatic attempt; this screen never prompts on its own.
  it('focuses the password field without prompting for biometrics again', async () => {
    await setup();
    await waitFor(() => expect(focusedTestIds()).toEqual(['unlock-password']));
    expect(await screen.findByRole('button', { name: 'Use Face ID' })).toBeTruthy();
    expect(walletService.unlockWithBiometrics).not.toHaveBeenCalled();
  });

  it('focuses the password field without biometrics', async () => {
    walletService.isBiometricUnlockEnabled.mockResolvedValue(false);
    await setup();
    await waitFor(() => expect(focusedTestIds()).toEqual(['unlock-password']));
    expect(walletService.unlockWithBiometrics).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Use Face ID' })).toBeNull();
    expect(screen.getByTestId('unlock-password').props).toMatchObject({ returnKeyType: 'go', secureTextEntry: true });
  });

  it('shows why the splash fell back to the password', async () => {
    await setup({ error: 'Biometric password is out of date. Enter your password.' });
    expect(screen.getByText('Biometric password is out of date. Enter your password.')).toBeTruthy();
  });

  it('explains a biometric lockout from the button', async () => {
    walletService.unlockWithBiometrics.mockRejectedValue(new AppError(AppErrorCode.BIOMETRICS_UNAVAILABLE));
    await setup();
    await fireEvent.press(await screen.findByRole('button', { name: 'Use Face ID' }));
    expect(await screen.findByText('Face ID is unavailable. Enter your password.')).toBeTruthy();
    expect(useSessionStore.getState().status).toBe(SessionStatus.LOCKED);
  });

  it('runs one unlock at a time across the keyboard, the button and biometrics', async () => {
    const pending = deferred();

    walletService.unlock.mockReturnValue(pending.promise);
    await setup();
    const biometricButton = await screen.findByRole('button', { name: 'Use Face ID' });

    await fireEvent.changeText(screen.getByTestId('unlock-password'), 'correct horse battery');
    let firstSubmit: Promise<void> = Promise.resolve();

    // fireEvent would wait for the pending unlock, so the handler is called directly.
    await act(async () => {
      firstSubmit = screen.getByTestId('unlock-password').props.onSubmitEditing();
    });

    await fireEvent.press(biometricButton);
    await fireEvent(screen.getByTestId('unlock-password'), 'submitEditing');

    expect(walletService.unlock).toHaveBeenCalledTimes(1);
    expect(walletService.unlockWithBiometrics).not.toHaveBeenCalled();

    await act(async () => pending.resolve());
    await firstSubmit;
    expect(useSessionStore.getState().status).toBe(SessionStatus.UNLOCKED);
  });

  it('accepts a new attempt after a failed one', async () => {
    walletService.unlock.mockRejectedValueOnce(new AppError(AppErrorCode.INVALID_PASSWORD)).mockResolvedValueOnce(undefined);
    await setup();

    await fireEvent.changeText(screen.getByTestId('unlock-password'), 'wrong password');
    await fireEvent.press(screen.getByTestId('unlock-submit'));
    expect(await screen.findByText('Incorrect password.')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('unlock-password'), 'correct horse battery');
    await fireEvent.press(screen.getByTestId('unlock-submit'));
    await waitFor(() => expect(useSessionStore.getState().status).toBe(SessionStatus.UNLOCKED));
    expect(walletService.unlock).toHaveBeenCalledTimes(2);
  });

  it('drops the biometric button once the enrolled biometrics changed', async () => {
    // The service turns the setting off before it rejects; the screen only refreshes the status.
    walletService.unlockWithBiometrics.mockImplementation(async () => {
      walletService.isBiometricUnlockEnabled.mockResolvedValue(false);
      throw new AppError(AppErrorCode.BIOMETRICS_INVALIDATED, BIOMETRICS_INVALIDATED_MESSAGE);
    });
    await setup();
    await fireEvent.press(await screen.findByRole('button', { name: 'Use Face ID' }));

    expect(await screen.findByText(BIOMETRICS_INVALIDATED_MESSAGE)).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Use Face ID' })).toBeNull());
  });

  it('keeps the biometric button when biometrics are only unavailable', async () => {
    walletService.unlockWithBiometrics.mockRejectedValue(new AppError(AppErrorCode.BIOMETRICS_UNAVAILABLE));
    await setup();
    await fireEvent.press(await screen.findByRole('button', { name: 'Use Face ID' }));

    expect(await screen.findByText('Face ID is unavailable. Enter your password.')).toBeTruthy();
    expect(walletService.isBiometricUnlockEnabled).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Use Face ID' })).toBeTruthy();
  });
});
