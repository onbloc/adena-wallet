import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { ChangePasswordScreen } from '../../../../src/containers/main/change-password-screen';
import { AppError, AppErrorCode } from '../../../../src/core/errors';
import { BiometryKind } from '../../../../src/security/secure-store';
import { useToastStore } from '../../../../src/stores/toast.store';
import { focusedTestIds, focusMock } from '../../../helpers/focus';
import { createWrapper } from '../../../helpers/query-wrapper';
import { TEST_PASSWORD } from '../../../helpers/test-container';
import { wrapPage } from '../../components/pages/render-page';

type ChangePasswordProps = Parameters<typeof ChangePasswordScreen>[0];

const NEXT_PASSWORD = 'another sturdy passphrase 42';

describe('ChangePasswordScreen', () => {
  const walletService = {
    changePassword: jest.fn(),
    enableBiometricUnlock: jest.fn(),
    disableBiometricUnlock: jest.fn(),
    getBiometryKind: jest.fn(),
    isBiometricUnlockEnabled: jest.fn(),
    readBiometricPassword: jest.fn(),
  };
  const listeners: Record<string, (event?: unknown) => void> = {};
  const blurListener = (): void => listeners.blur();
  const navigation = {
    goBack: jest.fn(),
    addListener: jest.fn((event: string, handler: (event?: unknown) => void) => {
      listeners[event] = handler;
      return jest.fn();
    }),
  };
  const props = { navigation, route: { key: 'ChangePassword', name: 'ChangePassword' } } as unknown as ChangePasswordProps;

  const setup = async (): Promise<void> => {
    const { Wrapper } = createWrapper({ walletService });

    await render(wrapPage(<Wrapper><ChangePasswordScreen {...props} /></Wrapper>));
  };

  const fill = async (current = TEST_PASSWORD, next = NEXT_PASSWORD, confirm = next): Promise<void> => {
    await fireEvent.changeText(screen.getByTestId('current-password-input'), current);
    await fireEvent.changeText(screen.getByTestId('new-password-input'), next);
    await fireEvent.changeText(screen.getByTestId('new-password-confirm'), confirm);
  };

  const submit = (): Promise<void> => fireEvent.press(screen.getByTestId('change-password-submit'));

  beforeEach(() => {
    jest.clearAllMocks();
    walletService.changePassword.mockResolvedValue(undefined);
    walletService.enableBiometricUnlock.mockResolvedValue(undefined);
    walletService.disableBiometricUnlock.mockResolvedValue(undefined);
    walletService.getBiometryKind.mockResolvedValue(BiometryKind.FACE);
    walletService.isBiometricUnlockEnabled.mockResolvedValue(true);
    // A canceled prompt by default, so the typed current password is used.
    walletService.readBiometricPassword.mockRejectedValue(new AppError(AppErrorCode.BIOMETRICS_CANCELED, 'canceled'));
    focusMock().mockClear();
    useToastStore.getState().dismiss();
  });

  it('changes the password, re-escrows it for biometrics and goes back', async () => {
    await setup();
    expect(await screen.findByRole('switch', { name: /Unlock with/ })).toBeTruthy();
    await fill();
    await submit();

    await waitFor(() => expect(navigation.goBack).toHaveBeenCalledTimes(1));
    expect(walletService.changePassword).toHaveBeenCalledWith(TEST_PASSWORD, NEXT_PASSWORD);
    expect(walletService.enableBiometricUnlock).toHaveBeenCalledWith(NEXT_PASSWORD);
    expect(walletService.changePassword.mock.invocationCallOrder[0]).toBeLessThan(walletService.enableBiometricUnlock.mock.invocationCallOrder[0]);
    expect(walletService.disableBiometricUnlock).not.toHaveBeenCalled();
    expect(useToastStore.getState().toast).toMatchObject({ message: 'Password changed', tone: 'success' });
  });

  it('turns biometrics on with the new password when the switch is flipped on', async () => {
    walletService.isBiometricUnlockEnabled.mockResolvedValue(false);
    await setup();
    await fireEvent.press(await screen.findByRole('switch', { name: /Unlock with/ }));
    await fill();
    await submit();

    await waitFor(() => expect(navigation.goBack).toHaveBeenCalledTimes(1));
    expect(walletService.enableBiometricUnlock).toHaveBeenCalledWith(NEXT_PASSWORD);
  });

  it('turns biometrics off when the switch is flipped off', async () => {
    await setup();
    await fireEvent.press(await screen.findByRole('switch', { name: /Unlock with/ }));
    await fill();
    await submit();

    await waitFor(() => expect(navigation.goBack).toHaveBeenCalledTimes(1));
    expect(walletService.disableBiometricUnlock).toHaveBeenCalledTimes(1);
    expect(walletService.enableBiometricUnlock).not.toHaveBeenCalled();
  });

  it('leaves biometrics alone when they stay off', async () => {
    walletService.isBiometricUnlockEnabled.mockResolvedValue(false);
    await setup();
    await screen.findByRole('switch', { name: /Unlock with/ });
    await fill();
    await submit();

    await waitFor(() => expect(navigation.goBack).toHaveBeenCalledTimes(1));
    expect(walletService.enableBiometricUnlock).not.toHaveBeenCalled();
    expect(walletService.disableBiometricUnlock).not.toHaveBeenCalled();
  });

  it('hides the switch without biometrics', async () => {
    walletService.getBiometryKind.mockResolvedValue(null);
    walletService.isBiometricUnlockEnabled.mockResolvedValue(false);
    await setup();
    await waitFor(() => expect(walletService.getBiometryKind).toHaveBeenCalled());
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('keeps the new password and warns when enabling biometrics fails', async () => {
    walletService.enableBiometricUnlock.mockRejectedValue(new AppError(AppErrorCode.BIOMETRICS_CANCELED, 'Cancelled'));
    await setup();
    await screen.findByRole('switch', { name: /Unlock with/ });
    await fill();
    await submit();

    await waitFor(() => expect(navigation.goBack).toHaveBeenCalledTimes(1));
    expect(walletService.changePassword).toHaveBeenCalledTimes(1);
    // The credential escrowed with the old password is dropped.
    expect(walletService.disableBiometricUnlock).toHaveBeenCalledTimes(1);
    expect(useToastStore.getState().toast?.tone).toBe('warning');
    expect(useToastStore.getState().toast?.message).toMatch(/^Password changed, but .+ unlock could not be updated$/);
  });

  it('shows an incorrect current password', async () => {
    walletService.changePassword.mockRejectedValue(new AppError(AppErrorCode.INVALID_PASSWORD, 'Incorrect password'));
    await setup();
    await fill('wrong password');
    await submit();

    expect(await screen.findByText('Incorrect password.')).toBeTruthy();
    expect(walletService.enableBiometricUnlock).not.toHaveBeenCalled();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  it('shows the lockout message after too many attempts', async () => {
    walletService.changePassword.mockRejectedValue(new AppError(AppErrorCode.PASSWORD_ATTEMPTS_EXCEEDED, 'Too many attempts. Try again in 30 seconds.'));
    await setup();
    await fill();
    await submit();

    expect(await screen.findByText('Too many attempts. Try again in 30 seconds.')).toBeTruthy();
  });

  it('rejects a mismatched confirmation without calling the service', async () => {
    await setup();
    await fill(TEST_PASSWORD, NEXT_PASSWORD, 'something else entirely');
    await submit();

    expect(screen.getByText('Passwords do not match')).toBeTruthy();
    expect(walletService.changePassword).not.toHaveBeenCalled();
  });

  it.each([
    ['a weak password', '12345678', 'Password is too simple.'],
    ['the current password', TEST_PASSWORD, 'You can’t use your current password'],
  ])('rejects %s without calling the service', async (_name, next, message) => {
    await setup();
    await fill(TEST_PASSWORD, next);
    await submit();

    expect(screen.getByText(message)).toBeTruthy();
    expect(walletService.changePassword).not.toHaveBeenCalled();
  });

  it('submits only once when pressed again while the change is in flight', async () => {
    await setup();
    await fill();
    const button = screen.getByTestId('change-password-submit');

    // The second press lands before the first submit settles or re-renders.
    walletService.changePassword.mockImplementationOnce(() => fireEvent.press(button));
    await fireEvent.press(button);

    await waitFor(() => expect(navigation.goBack).toHaveBeenCalledTimes(1));
    expect(walletService.changePassword).toHaveBeenCalledTimes(1);
  });

  it('clears the password fields on blur', async () => {
    await setup();
    await fill();
    await act(async () => blurListener());

    await waitFor(() => expect(screen.getByTestId('current-password-input').props.value).toBe(''));
    expect(screen.getByTestId('new-password-input').props.value).toBe('');
    expect(screen.getByTestId('new-password-confirm').props.value).toBe('');
  });

  it('blocks leaving while the change is in flight', async () => {
    let finish!: () => void;

    walletService.changePassword.mockImplementationOnce(() => new Promise<void>((done) => {
      finish = done;
    }));
    await setup();
    await screen.findByRole('switch', { name: /Unlock with/ });
    await fill();
    await act(async () => {
      fireEvent.press(screen.getByTestId('change-password-submit'));
    });

    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    const removal = { preventDefault: jest.fn() };

    listeners.beforeRemove(removal);
    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(removal.preventDefault).toHaveBeenCalledTimes(1);

    await act(async () => finish());
    await waitFor(() => expect(navigation.goBack).toHaveBeenCalledTimes(1));
    const afterwards = { preventDefault: jest.fn() };

    listeners.beforeRemove(afterwards);
    expect(afterwards.preventDefault).not.toHaveBeenCalled();
  });

  describe('biometrics first for the current password', () => {
    it('prompts once on open and changes the password with the released current password', async () => {
      walletService.readBiometricPassword.mockResolvedValue(TEST_PASSWORD);
      await setup();

      expect(await screen.findByText('Current password verified with Face ID')).toBeTruthy();
      expect(walletService.readBiometricPassword).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('current-password-input')).toBeNull();
      expect(focusedTestIds()).toEqual(['new-password-input']);

      await fireEvent.changeText(screen.getByTestId('new-password-input'), NEXT_PASSWORD);
      await fireEvent.changeText(screen.getByTestId('new-password-confirm'), NEXT_PASSWORD);
      await fireEvent(screen.getByTestId('new-password-confirm'), 'submitEditing');

      await waitFor(() => expect(navigation.goBack).toHaveBeenCalledTimes(1));
      expect(walletService.changePassword).toHaveBeenCalledWith(TEST_PASSWORD, NEXT_PASSWORD);
    });

    it('falls back to the focused current password field after a cancel, and retries from the button', async () => {
      await setup();

      await waitFor(() => expect(focusedTestIds()).toEqual(['current-password-input']));
      expect(walletService.readBiometricPassword).toHaveBeenCalledTimes(1);
      walletService.readBiometricPassword.mockResolvedValueOnce(TEST_PASSWORD);
      await fireEvent.press(screen.getByRole('button', { name: 'Use Face ID' }));

      expect(walletService.readBiometricPassword).toHaveBeenCalledTimes(2);
      expect(await screen.findByText('Current password verified with Face ID')).toBeTruthy();
    });

    it('explains a lockout and keeps the typed path', async () => {
      walletService.readBiometricPassword.mockRejectedValue(new AppError(AppErrorCode.BIOMETRICS_UNAVAILABLE, 'lockout'));
      await setup();

      expect(await screen.findByText('Face ID is unavailable. Enter your password.')).toBeTruthy();
      await fill();
      await submit();
      await waitFor(() => expect(walletService.changePassword).toHaveBeenCalledWith(TEST_PASSWORD, NEXT_PASSWORD));
    });

    it('focuses the current password without prompting when biometric unlock is off', async () => {
      walletService.isBiometricUnlockEnabled.mockResolvedValue(false);
      await setup();

      await waitFor(() => expect(focusedTestIds()).toEqual(['current-password-input']));
      expect(walletService.readBiometricPassword).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: 'Use Face ID' })).toBeNull();
    });
  });
});
