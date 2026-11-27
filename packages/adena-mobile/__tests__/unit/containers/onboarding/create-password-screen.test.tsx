import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { CreatePasswordPageProps } from '../../../../src/components/pages';
import { CreatePasswordScreen } from '../../../../src/containers/onboarding/create-password-screen';
import { AppError, AppErrorCode } from '../../../../src/core/errors';
import { BiometryKind } from '../../../../src/security/secure-store';
import { ENABLE_BIOMETRICS_PROMPT } from '../../../../src/services/wallet.service';
import { useOnboardingStore } from '../../../../src/stores/onboarding.store';
import { SessionStatus, useSessionStore } from '../../../../src/stores/session.store';
import { useToastStore } from '../../../../src/stores/toast.store';
import { createWrapper } from '../../../helpers/query-wrapper';
import { TEST_MNEMONIC, TEST_PASSWORD } from '../../../helpers/test-container';
import { wrapPage } from '../../components/pages/render-page';

type CreatePasswordProps = Parameters<typeof CreatePasswordScreen>[0];

const mockPage: { props?: CreatePasswordPageProps } = {};

jest.mock('../../../../src/components/pages', () => {
  const actual = jest.requireActual('../../../../src/components/pages');

  return {
    ...actual,
    CreatePasswordPage: (props: CreatePasswordPageProps) => {
      mockPage.props = props;
      return actual.CreatePasswordPage(props);
    },
  };
});

describe('CreatePasswordScreen', () => {
  const walletService = {
    createWallet: jest.fn(),
    enableBiometricUnlock: jest.fn(),
    getStatus: jest.fn(),
    lock: jest.fn(),
    getBiometryKind: jest.fn(),
    isBiometricUnlockEnabled: jest.fn(),
  };
  const cloudBackupService = { provider: 'icloud', restoreWallet: jest.fn(), createBackup: jest.fn() };
  let beforeRemove: ((event: { preventDefault: () => void }) => void) | undefined;
  const navigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    popToTop: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn((_type: string, handler: typeof beforeRemove) => {
      beforeRemove = handler;
      return jest.fn();
    }),
  };
  const props = { navigation, route: { key: 'CreatePassword', name: 'CreatePassword' } } as unknown as CreatePasswordProps;

  const renderScreen = async (): Promise<void> => {
    const { Wrapper } = createWrapper({ walletService, cloudBackupService });

    await render(wrapPage(<Wrapper><CreatePasswordScreen {...props} /></Wrapper>));
  };

  const fillAndSubmit = async (): Promise<void> => {
    await renderScreen();
    await fireEvent.changeText(screen.getByTestId('password-input'), TEST_PASSWORD);
    await fireEvent.changeText(screen.getByTestId('password-confirm'), TEST_PASSWORD);
    await fireEvent.press(screen.getByTestId('password-submit'));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    walletService.getBiometryKind.mockResolvedValue(null);
    walletService.isBiometricUnlockEnabled.mockResolvedValue(false);
    walletService.getStatus.mockResolvedValue(SessionStatus.UNLOCKED);
    beforeRemove = undefined;
    useOnboardingStore.getState().clear();
    useOnboardingStore.setState({ mnemonic: TEST_MNEMONIC });
    useSessionStore.setState({ status: SessionStatus.EMPTY });
    useToastStore.getState().dismiss();
  });

  it('creates the wallet and opens it', async () => {
    walletService.createWallet.mockResolvedValue(undefined);
    await fillAndSubmit();

    await waitFor(() => expect(useSessionStore.getState().status).toBe(SessionStatus.UNLOCKED));
    expect(walletService.createWallet).toHaveBeenCalledWith({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });
    expect(useOnboardingStore.getState().mnemonic).toBeNull();
    expect(walletService.enableBiometricUnlock).not.toHaveBeenCalled();
  });

  it('freezes both password fields while the wallet is being created', async () => {
    let finish: () => void = () => undefined;

    walletService.createWallet.mockImplementation(() => new Promise<void>((resolve) => {
      finish = resolve;
    }));
    await renderScreen();
    await fireEvent.changeText(screen.getByTestId('password-input'), TEST_PASSWORD);
    await fireEvent.changeText(screen.getByTestId('password-confirm'), TEST_PASSWORD);
    // fireEvent would wait for the pending creation, so the press is not awaited.
    await act(async () => {
      fireEvent.press(screen.getByTestId('password-submit'));
    });

    for (const testID of ['password-input', 'password-confirm']) {
      expect(screen.getByTestId(testID).props.editable).toBe(false);
      // A late change event from the native field is ignored as well.
      await act(async () => screen.getByTestId(testID).props.onChangeText('other password 123'));
      expect(screen.getByTestId(testID).props.value).toBe(TEST_PASSWORD);
    }

    await act(async () => finish());
    expect(walletService.createWallet).toHaveBeenCalledWith({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD });
  });

  it('leaves biometric unlock off unless it was chosen on the protect step', async () => {
    walletService.getBiometryKind.mockResolvedValue(BiometryKind.FACE);
    walletService.createWallet.mockResolvedValue(undefined);
    await fillAndSubmit();

    await waitFor(() => expect(useSessionStore.getState().status).toBe(SessionStatus.UNLOCKED));
    expect(walletService.enableBiometricUnlock).not.toHaveBeenCalled();
  });

  it('enables biometric unlock when chosen and the device supports it', async () => {
    useOnboardingStore.setState({ enableBiometrics: true });
    walletService.getBiometryKind.mockResolvedValue(BiometryKind.FACE);
    walletService.createWallet.mockResolvedValue(undefined);
    walletService.enableBiometricUnlock.mockResolvedValue(undefined);
    await fillAndSubmit();

    await waitFor(() => expect(useSessionStore.getState().status).toBe(SessionStatus.UNLOCKED));
    expect(screen.queryByRole('switch')).toBeNull();
    expect(walletService.enableBiometricUnlock).toHaveBeenCalledWith(TEST_PASSWORD, ENABLE_BIOMETRICS_PROMPT);
    expect(walletService.createWallet.mock.invocationCallOrder[0]).toBeLessThan(walletService.enableBiometricUnlock.mock.invocationCallOrder[0]);
    expect(useToastStore.getState().toast).toBeNull();
  });

  it('still opens the wallet when enabling biometrics fails or is cancelled', async () => {
    useOnboardingStore.setState({ enableBiometrics: true });
    walletService.getBiometryKind.mockResolvedValue(BiometryKind.FACE);
    walletService.createWallet.mockResolvedValue(undefined);
    walletService.enableBiometricUnlock.mockRejectedValue(new AppError(AppErrorCode.BIOMETRICS_UNAVAILABLE, 'Cancelled'));
    await fillAndSubmit();

    await waitFor(() => expect(useSessionStore.getState().status).toBe(SessionStatus.UNLOCKED));
    expect(useOnboardingStore.getState().mnemonic).toBeNull();
    expect(walletService.lock).not.toHaveBeenCalled();
    expect(useToastStore.getState().toast?.message).toBe('Biometric unlock could not be enabled');
  });

  it('still opens the wallet when the biometry check fails', async () => {
    useOnboardingStore.setState({ enableBiometrics: true });
    walletService.getBiometryKind.mockRejectedValue(new Error('Keychain unavailable'));
    walletService.createWallet.mockResolvedValue(undefined);
    await fillAndSubmit();

    await waitFor(() => expect(useSessionStore.getState().status).toBe(SessionStatus.UNLOCKED));
    expect(walletService.enableBiometricUnlock).not.toHaveBeenCalled();
    expect(useToastStore.getState().toast?.message).toBe('Biometric unlock could not be enabled');
  });

  it('creates the accounts picked on the import list', async () => {
    useOnboardingStore.setState({ hdIndexes: [0, 3, 7] });
    walletService.createWallet.mockResolvedValue(undefined);
    await fillAndSubmit();

    await waitFor(() => expect(useSessionStore.getState().status).toBe(SessionStatus.UNLOCKED));
    expect(walletService.createWallet).toHaveBeenCalledWith({ mnemonic: TEST_MNEMONIC, password: TEST_PASSWORD, hdIndexes: [0, 3, 7] });
    expect(useOnboardingStore.getState().hdIndexes).toBeNull();
  });

  it('writes the cloud backup chosen earlier once the wallet exists', async () => {
    useOnboardingStore.setState({ backupPassword: 'violet orbit lantern 42' });
    walletService.createWallet.mockResolvedValue(undefined);
    cloudBackupService.createBackup.mockResolvedValue({ kind: 'backedUp' });
    await fillAndSubmit();

    await waitFor(() => expect(useSessionStore.getState().status).toBe(SessionStatus.UNLOCKED));
    expect(cloudBackupService.createBackup).toHaveBeenCalledWith({ walletPassword: TEST_PASSWORD, backupPassword: 'violet orbit lantern 42', confirmPassword: 'violet orbit lantern 42' });
    expect(walletService.createWallet.mock.invocationCallOrder[0]).toBeLessThan(cloudBackupService.createBackup.mock.invocationCallOrder[0]);
    expect(useOnboardingStore.getState().backupPassword).toBeNull();
    expect(useToastStore.getState().toast).toBeNull();
  });

  it.each([
    ['throws', () => cloudBackupService.createBackup.mockRejectedValue(new Error('offline'))],
    ['reports an upload error', () => cloudBackupService.createBackup.mockResolvedValue({ kind: 'backedUp', uploading: { error: new Error('quota') } })],
  ])('sends the user to write the phrase down when the cloud backup %s', async (_case, arrange) => {
    useOnboardingStore.setState({ backupPassword: 'violet orbit lantern 42' });
    walletService.createWallet.mockResolvedValue(undefined);
    arrange();
    await fillAndSubmit();

    await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith('BackupPhrase', { afterCreate: true }));
    expect(useSessionStore.getState().status).toBe(SessionStatus.EMPTY);
    // Kept for the manual backup step.
    expect(useOnboardingStore.getState().mnemonic).toBe(TEST_MNEMONIC);
    expect(useToastStore.getState().toast).toMatchObject({ tone: 'warning', message: 'iCloud backup did not finish. Write down your recovery phrase now.' });
  });

  it('offers the phrase step when the provider has not confirmed the upload yet', async () => {
    useOnboardingStore.setState({ backupPassword: 'violet orbit lantern 42' });
    walletService.createWallet.mockResolvedValue(undefined);
    cloudBackupService.createBackup.mockResolvedValue({ kind: 'backedUp', uploading: {} });
    await fillAndSubmit();

    await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith('BackupPhrase', { afterCreate: true, uploadPending: true }));
    expect(useSessionStore.getState().status).toBe(SessionStatus.EMPTY);
    expect(useToastStore.getState().toast).toMatchObject({ tone: 'info', message: 'iCloud has not confirmed the upload yet. You can also write down your recovery phrase.' });
  });

  it('stops waiting for a cloud backup that does not finish in time', async () => {
    jest.useFakeTimers();

    try {
      useOnboardingStore.setState({ backupPassword: 'violet orbit lantern 42' });
      walletService.createWallet.mockResolvedValue(undefined);
      cloudBackupService.createBackup.mockReturnValue(new Promise(() => undefined));
      await fillAndSubmit();
      await act(async () => {
        await jest.advanceTimersByTimeAsync(60_000);
      });

      expect(navigation.navigate).toHaveBeenCalledWith('BackupPhrase', { afterCreate: true });
    }
    finally {
      jest.useRealTimers();
    }
  });

  it('skips the cloud backup when none was chosen', async () => {
    walletService.createWallet.mockResolvedValue(undefined);
    await fillAndSubmit();

    await waitFor(() => expect(useSessionStore.getState().status).toBe(SessionStatus.UNLOCKED));
    expect(cloudBackupService.createBackup).not.toHaveBeenCalled();
  });

  it('rejects a wallet password equal to the backup password', async () => {
    useOnboardingStore.setState({ backupPassword: TEST_PASSWORD });
    await fillAndSubmit();

    expect(await screen.findByText('Use a different password from your backup password')).toBeTruthy();
    expect(walletService.createWallet).not.toHaveBeenCalled();
  });

  it('labels the step by whether the protect step was offered', async () => {
    walletService.getBiometryKind.mockResolvedValue(BiometryKind.FACE);
    await renderScreen();
    expect(await screen.findByText('SETUP / 2 OF 2')).toBeTruthy();
  });

  it('labels the step without biometrics', async () => {
    await renderScreen();
    expect(await screen.findByText('SETUP / PASSWORD')).toBeTruthy();
  });

  it('stays on the form when nothing was stored', async () => {
    walletService.createWallet.mockRejectedValue(new AppError(AppErrorCode.STORAGE_ERROR, 'Keychain write failed'));
    walletService.getStatus.mockResolvedValue(SessionStatus.EMPTY);
    await fillAndSubmit();

    expect(await screen.findByText('Keychain write failed')).toBeTruthy();
    expect(walletService.lock).not.toHaveBeenCalled();
    expect(useSessionStore.getState().status).toBe(SessionStatus.EMPTY);
    expect(useOnboardingStore.getState().mnemonic).toBe(TEST_MNEMONIC);
  });

  it('locks and leaves onboarding when the vault was written before the failure', async () => {
    walletService.createWallet.mockRejectedValue(new AppError(AppErrorCode.STORAGE_ERROR, 'Account write failed'));
    walletService.getStatus.mockResolvedValue(SessionStatus.UNLOCKED);
    await fillAndSubmit();

    await waitFor(() => expect(useSessionStore.getState().status).toBe(SessionStatus.LOCKED));
    expect(walletService.lock).toHaveBeenCalledTimes(1);
    expect(useOnboardingStore.getState().mnemonic).toBeNull();
    expect(useToastStore.getState().toast?.message).toBe('Your wallet was saved. Unlock it to continue.');
  });

  it('does not reopen the wallet when it was locked during the biometric prompt', async () => {
    useOnboardingStore.setState({ enableBiometrics: true });
    walletService.getBiometryKind.mockResolvedValue(BiometryKind.FACE);
    walletService.createWallet.mockResolvedValue(undefined);
    // e.g. the error boundary locked the keyring while the prompt was open.
    walletService.enableBiometricUnlock.mockImplementation(async () => {
      walletService.getStatus.mockResolvedValue(SessionStatus.LOCKED);
    });
    await fillAndSubmit();

    await waitFor(() => expect(useSessionStore.getState().status).toBe(SessionStatus.LOCKED));
    expect(useOnboardingStore.getState().mnemonic).toBeNull();
    expect(useToastStore.getState().toast?.message).toBe('Your wallet was saved. Unlock it to continue.');
  });

  it('starts onboarding over when the new wallet was removed meanwhile', async () => {
    walletService.createWallet.mockResolvedValue(undefined);
    walletService.getStatus.mockResolvedValue(SessionStatus.EMPTY);
    await fillAndSubmit();

    await waitFor(() => expect(navigation.popToTop).toHaveBeenCalledTimes(1));
    expect(useSessionStore.getState().status).toBe(SessionStatus.EMPTY);
  });

  it('blocks leaving the screen while the wallet is being created', async () => {
    let finish: () => void = () => undefined;

    walletService.createWallet.mockImplementation(() => new Promise<void>((resolve) => {
      finish = resolve;
    }));
    await renderScreen();
    await fireEvent.changeText(screen.getByTestId('password-input'), TEST_PASSWORD);
    await fireEvent.changeText(screen.getByTestId('password-confirm'), TEST_PASSWORD);
    // Pressed without awaiting the submit, which stays pending until finish().
    await act(async () => {
      mockPage.props?.onSubmit();
    });

    const event = { preventDefault: jest.fn() };

    beforeRemove?.(event);
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(navigation.setOptions).toHaveBeenLastCalledWith({ gestureEnabled: false });

    await act(async () => finish());
    await waitFor(() => expect(useSessionStore.getState().status).toBe(SessionStatus.UNLOCKED));
  });

  it('allows leaving the screen when not submitting', async () => {
    await renderScreen();
    const event = { preventDefault: jest.fn() };

    beforeRemove?.(event);
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  it('shows a strength label only for passwords the policy accepts', async () => {
    await renderScreen();

    // 7 characters: zxcvbn rates it medium, but the length rule rejects it.
    await fireEvent.changeText(screen.getByTestId('password-input'), 'aaaZq7!');
    expect(screen.queryByTestId('password-strength')).toBeNull();

    await fireEvent.changeText(screen.getByTestId('password-input'), TEST_PASSWORD);
    expect(screen.getByTestId('password-strength')).toBeTruthy();
  });

  it('restores a decrypted cloud backup with the new password instead of creating a wallet', async () => {
    const backup = { version: 1, backupId: 'a'.repeat(32), createdAt: 1, keyrings: [] } as never;

    useOnboardingStore.setState({ mnemonic: null, restoreBackup: backup });
    cloudBackupService.restoreWallet.mockResolvedValue(undefined);
    await fillAndSubmit();

    await waitFor(() => expect(useSessionStore.getState().status).toBe(SessionStatus.UNLOCKED));
    expect(screen.queryByText('Creating wallet…')).toBeNull();
    expect(cloudBackupService.restoreWallet).toHaveBeenCalledWith(backup, TEST_PASSWORD);
    expect(walletService.createWallet).not.toHaveBeenCalled();
    expect(useOnboardingStore.getState().restoreBackup).toBeNull();
  });

  it('never swaps the phrase it was opened with for a backup set later', async () => {
    const backup = { version: 1, backupId: 'a'.repeat(32), createdAt: 1, keyrings: [] } as never;

    await renderScreen();
    await act(() => useOnboardingStore.getState().setRestoreBackup(backup));
    await fireEvent.changeText(screen.getByTestId('password-input'), TEST_PASSWORD);
    await fireEvent.changeText(screen.getByTestId('password-confirm'), TEST_PASSWORD);
    await fireEvent.press(screen.getByTestId('password-submit'));

    expect(cloudBackupService.restoreWallet).not.toHaveBeenCalled();
    expect(walletService.createWallet).not.toHaveBeenCalled();
    expect(props.navigation.popToTop).toHaveBeenCalled();
    expect(useOnboardingStore.getState()).toMatchObject({ mnemonic: null, restoreBackup: null });
  });

  it('goes back to the start without a phrase or backup', async () => {
    useOnboardingStore.setState({ mnemonic: null, restoreBackup: null });
    await fillAndSubmit();

    expect(props.navigation.popToTop).toHaveBeenCalled();
    expect(walletService.createWallet).not.toHaveBeenCalled();
  });
});
