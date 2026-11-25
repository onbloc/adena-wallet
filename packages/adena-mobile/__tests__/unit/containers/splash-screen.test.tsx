import { render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { SplashScreen } from '../../../src/containers/splash-screen';
import { AppError, AppErrorCode, BIOMETRICS_INVALIDATED_MESSAGE } from '../../../src/core/errors';
import { BiometryKind } from '../../../src/security/secure-store';
import { SessionStatus, useSessionStore } from '../../../src/stores/session.store';
import { createWrapper } from '../../helpers/query-wrapper';
import { wrapPage } from '../components/pages/render-page';

type SplashProps = Parameters<typeof SplashScreen>[0];

describe('SplashScreen', () => {
  const walletService = {
    unlockWithBiometrics: jest.fn(),
    getBiometryKind: jest.fn(),
    isBiometricUnlockEnabled: jest.fn(),
  };
  const navigation = { replace: jest.fn() };
  const props = { navigation, route: { key: 'Splash', name: 'Splash' } } as unknown as SplashProps;

  const setup = () => {
    const { Wrapper } = createWrapper({ walletService });
    const tree = () => wrapPage(<Wrapper><SplashScreen {...props} /></Wrapper>);

    return { view: render(tree()), tree };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    walletService.getBiometryKind.mockResolvedValue(BiometryKind.FACE);
    walletService.isBiometricUnlockEnabled.mockResolvedValue(true);
    walletService.unlockWithBiometrics.mockResolvedValue(undefined);
    useSessionStore.setState({ status: SessionStatus.LOCKED, revision: 0 });
  });

  it('shows the labelled logo while it asks for biometrics', async () => {
    walletService.unlockWithBiometrics.mockReturnValue(new Promise(() => undefined));
    await setup().view;

    expect(screen.getByLabelText('Adena, unlocking')).toBeTruthy();
    await waitFor(() => expect(walletService.unlockWithBiometrics).toHaveBeenCalledWith({ title: 'Unlock Adena', cancel: 'Use password' }));
  });

  it('unlocks straight into the wallet when biometrics succeed', async () => {
    await setup().view;

    await waitFor(() => expect(useSessionStore.getState().status).toBe(SessionStatus.UNLOCKED));
    expect(useSessionStore.getState().revision).toBe(1);
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it('falls back to the password without a message on cancel', async () => {
    walletService.unlockWithBiometrics.mockRejectedValue(new AppError(AppErrorCode.BIOMETRICS_CANCELED));
    await setup().view;

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('Unlock', { error: undefined }));
    expect(useSessionStore.getState().status).toBe(SessionStatus.LOCKED);
  });

  it.each([
    ['lockout or an invalidated key', AppErrorCode.BIOMETRICS_UNAVAILABLE, 'Face ID is unavailable. Enter your password.'],
    ['an out-of-date stored password', AppErrorCode.INVALID_PASSWORD, 'Biometric password is out of date. Enter your password.'],
  ])('passes the reason for %s to the unlock screen', async (_case, code, message) => {
    walletService.unlockWithBiometrics.mockRejectedValue(new AppError(code));
    await setup().view;

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('Unlock', { error: message }));
  });

  it('goes straight to the password when biometrics are off', async () => {
    walletService.isBiometricUnlockEnabled.mockResolvedValue(false);
    await setup().view;

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('Unlock'));
    expect(walletService.unlockWithBiometrics).not.toHaveBeenCalled();
  });

  it('asks only once even when it re-renders', async () => {
    walletService.unlockWithBiometrics.mockReturnValue(new Promise(() => undefined));
    const { view, tree } = setup();
    const rendered = await view;

    await waitFor(() => expect(walletService.unlockWithBiometrics).toHaveBeenCalledTimes(1));
    await rendered.rerender(tree());
    await rendered.rerender(tree());
    expect(walletService.unlockWithBiometrics).toHaveBeenCalledTimes(1);
  });

  it('refreshes the biometric status before falling back when biometrics changed', async () => {
    walletService.unlockWithBiometrics.mockImplementation(async () => {
      walletService.isBiometricUnlockEnabled.mockResolvedValue(false);
      throw new AppError(AppErrorCode.BIOMETRICS_INVALIDATED, BIOMETRICS_INVALIDATED_MESSAGE);
    });
    await setup().view;

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('Unlock', { error: BIOMETRICS_INVALIDATED_MESSAGE }));
    expect(walletService.isBiometricUnlockEnabled).toHaveBeenCalledTimes(2);
  });
});
