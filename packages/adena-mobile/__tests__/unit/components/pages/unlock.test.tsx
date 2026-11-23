import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { UnlockPage, UnlockPageProps } from '../../../../src/components/pages';
import { renderPage } from './render-page';

const props = (overrides: Partial<UnlockPageProps> = {}): UnlockPageProps => ({
  password: 'secret',
  onChangePassword: jest.fn(),
  submitting: false,
  onUnlock: jest.fn(),
  biometricLabel: 'Face ID',
  onBiometricUnlock: jest.fn(),
  onResetWallet: jest.fn(),
  ...overrides,
});

describe('UnlockPage', () => {
  it('reports every action', async () => {
    const page = props();

    await renderPage(<UnlockPage {...page} />);

    await fireEvent.changeText(screen.getByTestId('unlock-password'), 'next');
    await fireEvent(screen.getByTestId('unlock-password'), 'submitEditing');
    await fireEvent.press(screen.getByRole('button', { name: 'Unlock' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Use Face ID' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Forgot password? Reset wallet' }));

    expect(page.onChangePassword).toHaveBeenCalledWith('next');
    expect(page.onUnlock).toHaveBeenCalledTimes(2);
    expect(page.onBiometricUnlock).toHaveBeenCalledTimes(1);
    expect(page.onResetWallet).toHaveBeenCalledTimes(1);
  });

  it('shows errors and disables unlocking without a password', async () => {
    const page = props({ password: '', error: 'Incorrect password', onBiometricUnlock: undefined });

    await renderPage(<UnlockPage {...page} />);

    expect(screen.getByText('Incorrect password')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Use Face ID' })).toBeNull();
    await fireEvent.press(screen.getByTestId('unlock-submit'));
    expect(page.onUnlock).not.toHaveBeenCalled();
  });

  it('hides biometrics without a label and shows the submitting state', async () => {
    await renderPage(<UnlockPage {...props({ biometricLabel: undefined, submitting: true })} />);

    expect(screen.queryByText(/^Use /)).toBeNull();
    expect(screen.getByText('Unlocking…')).toBeTruthy();
  });
});
