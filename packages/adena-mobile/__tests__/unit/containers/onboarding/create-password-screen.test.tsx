import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { CreatePasswordScreen } from '../../../../src/containers/onboarding/create-password-screen';
import { AppError, AppErrorCode } from '../../../../src/core/errors';
import { useOnboardingStore } from '../../../../src/stores/onboarding.store';
import { SessionStatus, useSessionStore } from '../../../../src/stores/session.store';
import { useToastStore } from '../../../../src/stores/toast.store';
import { createWrapper } from '../../../helpers/query-wrapper';
import { TEST_MNEMONIC, TEST_PASSWORD } from '../../../helpers/test-container';
import { wrapPage } from '../../components/pages/render-page';

type CreatePasswordProps = Parameters<typeof CreatePasswordScreen>[0];

describe('CreatePasswordScreen', () => {
  const walletService = {
    createWallet: jest.fn(),
    enableBiometricUnlock: jest.fn(),
    getStatus: jest.fn(),
    lock: jest.fn(),
    getBiometryKind: jest.fn(),
    isBiometricUnlockEnabled: jest.fn(),
  };
  const props = { navigation: { goBack: jest.fn(), popToTop: jest.fn() }, route: { key: 'CreatePassword', name: 'CreatePassword' } } as unknown as CreatePasswordProps;

  const fillAndSubmit = async (): Promise<void> => {
    const { Wrapper } = createWrapper({ walletService });

    await render(wrapPage(<Wrapper><CreatePasswordScreen {...props} /></Wrapper>));
    await fireEvent.changeText(screen.getByTestId('password-input'), TEST_PASSWORD);
    await fireEvent.changeText(screen.getByTestId('password-confirm'), TEST_PASSWORD);
    await fireEvent.press(screen.getByTestId('password-submit'));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    walletService.getBiometryKind.mockResolvedValue(null);
    walletService.isBiometricUnlockEnabled.mockResolvedValue(false);
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
});
