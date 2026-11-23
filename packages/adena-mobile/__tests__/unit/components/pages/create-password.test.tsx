import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { CreatePasswordPage, CreatePasswordPageProps } from '../../../../src/components/pages';
import { renderPage } from './render-page';

const props = (overrides: Partial<CreatePasswordPageProps> = {}): CreatePasswordPageProps => ({
  password: 'password1',
  confirmPassword: 'password1',
  onChangePassword: jest.fn(),
  onChangeConfirmPassword: jest.fn(),
  biometricLabel: 'Face ID',
  biometricEnabled: false,
  onToggleBiometric: jest.fn(),
  submitting: false,
  onSubmit: jest.fn(),
  onBack: jest.fn(),
  ...overrides,
});

describe('CreatePasswordPage', () => {
  it('reports every action', async () => {
    const page = props();

    await renderPage(<CreatePasswordPage {...page} />);

    await fireEvent.changeText(screen.getByTestId('password-input'), 'abc');
    await fireEvent.changeText(screen.getByTestId('password-confirm'), 'abcd');
    await fireEvent.press(screen.getByRole('switch', { name: 'Unlock with Face ID' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Create wallet' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));

    expect(page.onChangePassword).toHaveBeenCalledWith('abc');
    expect(page.onChangeConfirmPassword).toHaveBeenCalledWith('abcd');
    expect(page.onToggleBiometric).toHaveBeenCalledWith(true);
    expect(page.onSubmit).toHaveBeenCalledTimes(1);
    expect(page.onBack).toHaveBeenCalledTimes(1);
  });

  it('shows validation messages and hides biometrics when unavailable', async () => {
    const page = props({ passwordError: 'Use at least 8 characters', confirmError: 'Passwords do not match', biometricLabel: undefined });

    await renderPage(<CreatePasswordPage {...page} />);

    expect(screen.getByText('Use at least 8 characters')).toBeTruthy();
    expect(screen.getByText('Passwords do not match')).toBeTruthy();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it.each([
    { password: '', confirmPassword: 'x' },
    { password: 'x', confirmPassword: '' },
  ])('disables submit until both fields are filled (%o)', async (values) => {
    const page = props(values);

    await renderPage(<CreatePasswordPage {...page} />);
    await fireEvent.press(screen.getByTestId('password-submit'));
    expect(page.onSubmit).not.toHaveBeenCalled();
  });

  it('shows the submitting label', async () => {
    await renderPage(<CreatePasswordPage {...props({ submitting: true })} />);

    expect(screen.getByText('Creating wallet…')).toBeTruthy();
  });
});
