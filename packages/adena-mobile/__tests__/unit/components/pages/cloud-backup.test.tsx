import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { CloudBackupPage, CloudBackupPageProps } from '../../../../src/components/pages';
import { renderPage } from './render-page';

const sheet = () => ({
  visible: false,
  password: '',
  onChangePassword: jest.fn(),
  error: undefined,
  submitting: false,
  onConfirm: jest.fn(),
  onClose: jest.fn(),
});

const props = (overrides: Partial<CloudBackupPageProps> = {}): CloudBackupPageProps => ({
  providerName: 'iCloud',
  state: { kind: 'none' },
  onBackUp: jest.fn(),
  onRetry: jest.fn(),
  onDelete: jest.fn(),
  deleteDialogVisible: false,
  deleting: false,
  onConfirmDelete: jest.fn(),
  onCancelDelete: jest.fn(),
  walletPasswordSheet: sheet(),
  onBack: jest.fn(),
  ...overrides,
});

describe('CloudBackupPage', () => {
  it('explains the backup and starts one', async () => {
    const page = props();

    await renderPage(<CloudBackupPage {...page} />);

    expect(screen.getByText('iCloud backup')).toBeTruthy();
    expect(screen.getByText('Back up your wallet')).toBeTruthy();
    expect(screen.getByText('Keep your password safe')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Back up now' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(page.onBackUp).toHaveBeenCalledTimes(1);
    expect(page.onBack).toHaveBeenCalledTimes(1);
  });

  it('shows a ready backup like the design', async () => {
    const page = props({ state: { kind: 'backedUp', backedUpAt: '2026-11-24 09:05', outdated: false, items: ['Recovery phrase'] } });

    await renderPage(<CloudBackupPage {...page} />);

    expect(screen.getByText('Your backup is ready')).toBeTruthy();
    expect(screen.getByText('Restore your wallet using your iCloud account and backup password.')).toBeTruthy();
    expect(screen.getByLabelText('Recovery phrase, Backed up')).toBeTruthy();
    expect(screen.getByText('Last backup: 2026-11-24 09:05')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Back up again' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Delete backup' }));
    expect(page.onDelete).toHaveBeenCalledTimes(1);
  });

  it('asks to back up again when outdated', async () => {
    const page = props({ providerName: 'Google Drive', state: { kind: 'backedUp', backedUpAt: '-', outdated: true, items: ['Recovery phrase', 'Private key'] } });

    await renderPage(<CloudBackupPage {...page} />);

    expect(screen.getByText('Google Drive backup')).toBeTruthy();
    expect(screen.getByText('Your backup is out of date')).toBeTruthy();
    expect(screen.getByLabelText('Private key, Out of date')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Back up again' }));
    expect(page.onBackUp).toHaveBeenCalledTimes(1);
  });

  it('shows loading, errors and notices', async () => {
    const page = props({ state: { kind: 'error', title: 'iCloud is not available', description: 'Sign in.' }, notice: { title: 'Backup failed', description: 'Quota' } });

    await renderPage(<CloudBackupPage {...page} />);
    expect(screen.getByText('iCloud is not available')).toBeTruthy();
    expect(screen.getByText('Backup failed')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(page.onRetry).toHaveBeenCalledTimes(1);

    await renderPage(<CloudBackupPage {...props({ state: { kind: 'loading' } })} />);
    expect(screen.queryByRole('button', { name: 'Back up now' })).toBeNull();
  });

  it('collects the backup password in place of the content', async () => {
    const backupForm = {
      password: 'abc',
      confirmPassword: '',
      onChangePassword: jest.fn(),
      onChangeConfirmPassword: jest.fn(),
      strength: { label: 'Strong', color: 'success' as const },
      confirmError: 'Passwords do not match',
      submitting: false,
      onSubmit: jest.fn(),
    };

    await renderPage(<CloudBackupPage {...props({ backupForm })} />);

    expect(screen.getByText('Create a backup password')).toBeTruthy();
    expect(screen.getByText('Password strength: Strong')).toBeTruthy();
    expect(screen.getByText('Passwords do not match')).toBeTruthy();
    expect(screen.queryByText('Back up your wallet')).toBeNull();
    await fireEvent.changeText(screen.getByTestId('backup-password-input'), 'abcd');
    await fireEvent.changeText(screen.getByTestId('backup-password-confirm'), 'abcd');
    expect(backupForm.onChangePassword).toHaveBeenCalledWith('abcd');
    expect(backupForm.onChangeConfirmPassword).toHaveBeenCalledWith('abcd');
    expect(screen.getByTestId('backup-password-submit').props.accessibilityState.disabled).toBe(true);
  });

  it('confirms deletion in a dialog', async () => {
    const page = props({ state: { kind: 'backedUp', backedUpAt: '-', outdated: false, items: [] }, deleteDialogVisible: true });

    await renderPage(<CloudBackupPage {...page} />);
    expect(screen.getByText('Delete backup?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(page.onConfirmDelete).toHaveBeenCalledTimes(1);
    expect(page.onCancelDelete).toHaveBeenCalledTimes(1);
  });

  it('warns about a cloud copy changed elsewhere and offers to back up again', async () => {
    const page = props({
      state: { kind: 'backedUp', backedUpAt: '-', outdated: false, items: [], remoteChange: { title: 'Updated on another device', description: 'Changed elsewhere.' } },
    });

    await renderPage(<CloudBackupPage {...page} />);
    expect(screen.getByText('Changed elsewhere.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Back up again' }));
    expect(page.onBackUp).toHaveBeenCalledTimes(1);
  });

  it('lists every backup with a delete action each', async () => {
    const page = props({
      state: { kind: 'backedUp', backedUpAt: '-', outdated: false, items: [] },
      backups: [{ id: 'mine', label: 'Backup from A', current: true }, { id: 'other', label: 'Backup from B', current: false }],
      onDeleteBackup: jest.fn(),
    });

    await renderPage(<CloudBackupPage {...page} />);
    expect(screen.getByText('This wallet')).toBeTruthy();
    expect(screen.getByText('Another wallet or device')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Delete Backup from B' }));
    expect(page.onDeleteBackup).toHaveBeenCalledWith('other');
  });

  it('shows the strength meter and asks before replacing a changed backup', async () => {
    const overwriteDialog = { visible: true, description: 'Updated elsewhere.', onConfirm: jest.fn(), onCancel: jest.fn() };
    const backupForm = {
      password: 'sunshine2024!',
      confirmPassword: '',
      onChangePassword: jest.fn(),
      onChangeConfirmPassword: jest.fn(),
      strength: { label: 'Too weak', color: 'error' as const, level: 1 },
      submitting: false,
      onSubmit: jest.fn(),
    };

    await renderPage(<CloudBackupPage {...props({ backupForm, overwriteDialog })} />);
    expect(screen.getByTestId('backup-password-meter')).toBeTruthy();
    expect(screen.getByText('Password strength: Too weak')).toBeTruthy();
    expect(screen.getByText('Replace the backup?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Replace' }));
    expect(overwriteDialog.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('asks for the wallet password before a delete', async () => {
    await renderPage(<CloudBackupPage {...props({ deletePasswordSheet: { ...sheet(), visible: true } })} />);
    expect(screen.getByText('Your wallet password is required to delete a backup from iCloud.')).toBeTruthy();
  });

  it('asks for the wallet password first', async () => {
    await renderPage(<CloudBackupPage {...props({ walletPasswordSheet: { ...sheet(), visible: true } })} />);
    expect(screen.getByText('Enter your wallet password')).toBeTruthy();
  });
});
