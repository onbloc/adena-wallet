import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { ChangePasswordPage, ChangePasswordPageProps } from '../../../../src/components/pages';
import { renderPage } from './render-page';

const props = (overrides: Partial<ChangePasswordPageProps> = {}): ChangePasswordPageProps => ({
  currentPassword: 'current password',
  newPassword: 'correct horse battery',
  confirmPassword: 'correct horse battery',
  onChangeCurrentPassword: jest.fn(),
  onChangeNewPassword: jest.fn(),
  onChangeConfirmPassword: jest.fn(),
  biometricLabel: 'Face ID',
  biometricEnabled: false,
  onToggleBiometric: jest.fn(),
  submitting: false,
  onSubmit: jest.fn(),
  onBack: jest.fn(),
  ...overrides,
});

describe('ChangePasswordPage', () => {
  it('reports every action', async () => {
    const page = props();

    await renderPage(<ChangePasswordPage {...page} />);

    await fireEvent.changeText(screen.getByTestId('current-password-input'), 'a');
    await fireEvent.changeText(screen.getByTestId('new-password-input'), 'b');
    await fireEvent.changeText(screen.getByTestId('new-password-confirm'), 'c');
    await fireEvent.press(screen.getByRole('switch', { name: 'Unlock with Face ID' }));
    await fireEvent.press(screen.getByTestId('change-password-submit'));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(page.onChangeCurrentPassword).toHaveBeenCalledWith('a');
    expect(page.onChangeNewPassword).toHaveBeenCalledWith('b');
    expect(page.onChangeConfirmPassword).toHaveBeenCalledWith('c');
    expect(page.onToggleBiometric).toHaveBeenCalledWith(true);
    expect(page.onSubmit).toHaveBeenCalledTimes(1);
    expect(page.onBack).toHaveBeenCalledTimes(1);
  });

  it('shows errors and hides biometrics when unavailable', async () => {
    const page = props({ currentError: 'Incorrect password.', newError: 'Password is too simple.', confirmError: 'Passwords do not match', biometricLabel: undefined });

    await renderPage(<ChangePasswordPage {...page} />);

    expect(screen.getByText('Incorrect password.')).toBeTruthy();
    expect(screen.getByText('Password is too simple.')).toBeTruthy();
    expect(screen.getByText('Passwords do not match')).toBeTruthy();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('shows the strength of a valid new password', async () => {
    await renderPage(<ChangePasswordPage {...props({ strength: { label: 'Strong', color: 'success' } })} />);

    expect(screen.getByText('Password strength: Strong')).toBeTruthy();
  });

  it.each([
    { currentPassword: '' },
    { newPassword: '' },
    { confirmPassword: '' },
  ])('disables submit until every field is filled (%o)', async (values) => {
    const page = props(values);

    await renderPage(<ChangePasswordPage {...page} />);
    await fireEvent.press(screen.getByTestId('change-password-submit'));
    expect(page.onSubmit).not.toHaveBeenCalled();
  });

  it('shows the submitting label', async () => {
    await renderPage(<ChangePasswordPage {...props({ submitting: true })} />);

    expect(screen.getByText('Changing password…')).toBeTruthy();
  });
});
