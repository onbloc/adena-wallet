import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import { UnlockScreen } from '../../../src/containers/unlock-screen';
import { AppError, AppErrorCode } from '../../../src/core/errors';
import { BiometryKind } from '../../../src/security/secure-store';
import { SessionStatus, useSessionStore } from '../../../src/stores/session.store';
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
  };
  const props = { navigation: { navigate: jest.fn() }, route: { key: 'Unlock', name: 'Unlock' } } as unknown as UnlockProps;

  const setup = () => {
    const { Wrapper } = createWrapper({ walletService });

    return render(wrapPage(<Wrapper><UnlockScreen {...props} /></Wrapper>));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    walletService.getBiometryKind.mockResolvedValue(BiometryKind.FACE);
    walletService.isBiometricUnlockEnabled.mockResolvedValue(true);
    walletService.unlockWithBiometrics.mockRejectedValue(new AppError(AppErrorCode.BIOMETRICS_CANCELED));
    useSessionStore.setState({ status: SessionStatus.LOCKED });
  });

  it('runs one unlock at a time across the keyboard, the button and biometrics', async () => {
    const pending = deferred();

    walletService.unlock.mockReturnValue(pending.promise);
    await setup();
    await waitFor(() => expect(walletService.unlockWithBiometrics).toHaveBeenCalledTimes(1));
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
    expect(walletService.unlockWithBiometrics).toHaveBeenCalledTimes(1);

    await act(async () => pending.resolve());
    await firstSubmit;
    expect(useSessionStore.getState().status).toBe(SessionStatus.UNLOCKED);
  });

  it('accepts a new attempt after a failed one', async () => {
    walletService.unlock.mockRejectedValueOnce(new AppError(AppErrorCode.INVALID_PASSWORD)).mockResolvedValueOnce(undefined);
    await setup();
    await waitFor(() => expect(walletService.unlockWithBiometrics).toHaveBeenCalledTimes(1));

    await fireEvent.changeText(screen.getByTestId('unlock-password'), 'wrong password');
    await fireEvent.press(screen.getByTestId('unlock-submit'));
    expect(await screen.findByText('Incorrect password.')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('unlock-password'), 'correct horse battery');
    await fireEvent.press(screen.getByTestId('unlock-submit'));
    await waitFor(() => expect(useSessionStore.getState().status).toBe(SessionStatus.UNLOCKED));
    expect(walletService.unlock).toHaveBeenCalledTimes(2);
  });
});
