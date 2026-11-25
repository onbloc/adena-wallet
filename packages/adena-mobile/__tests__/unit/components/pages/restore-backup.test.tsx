import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';

import { RestoreBackupPage, RestoreBackupPageProps } from '../../../../src/components/pages';
import { renderPage } from './render-page';

const props = (overrides: Partial<RestoreBackupPageProps> = {}): RestoreBackupPageProps => ({
  providerName: 'iCloud',
  state: { kind: 'ready', backups: [{ id: 'a', label: 'Backup from 2026-11-24 09:05' }], selectedId: 'a' },
  onSelect: jest.fn(),
  password: 'secret',
  onChangePassword: jest.fn(),
  submitting: false,
  onSubmit: jest.fn(),
  onRetry: jest.fn(),
  onBack: jest.fn(),
  ...overrides,
});

describe('RestoreBackupPage', () => {
  it('asks for the backup password of the only backup', async () => {
    const page = props({ error: 'Incorrect backup password.' });

    await renderPage(<RestoreBackupPage {...page} />);

    expect(screen.getByText('Restore from iCloud')).toBeTruthy();
    expect(screen.getByText('Backup from 2026-11-24 09:05')).toBeTruthy();
    expect(screen.getByText('Incorrect backup password.')).toBeTruthy();
    expect(screen.queryByRole('radio')).toBeNull();
    await fireEvent.changeText(screen.getByTestId('restore-backup-password'), 'abc');
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(page.onChangePassword).toHaveBeenCalledWith('abc');
    expect(page.onSubmit).toHaveBeenCalledTimes(1);
    expect(page.onBack).toHaveBeenCalledTimes(1);
  });

  it('lets the user pick one of several backups', async () => {
    const page = props({ state: { kind: 'ready', backups: [{ id: 'a', label: 'Backup A' }, { id: 'b', label: 'Backup B' }], selectedId: 'a' } });

    await renderPage(<RestoreBackupPage {...page} />);
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    await fireEvent.press(screen.getByRole('radio', { name: 'Backup B' }));
    expect(page.onSelect).toHaveBeenCalledWith('b');
  });

  it('offers the other versions of the selected backup, with a hint after a wrong password', async () => {
    const versions = [{ id: 'v2', label: 'Revision 2 · 2026-11-24 09:05', description: 'Latest' }, { id: 'v1', label: 'Revision 1 · 2026-11-20 10:00' }];
    const page = props({
      state: { kind: 'ready', backups: [{ id: 'v2', label: 'Backup A' }], selectedId: 'v2', versions, selectedVersionId: 'v2' },
      onOpenVersions: jest.fn(),
      onSelectVersion: jest.fn(),
      onCloseVersions: jest.fn(),
    });

    await renderPage(<RestoreBackupPage {...page} />);
    expect(screen.queryByTestId('restore-backup-choose-version')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Revision 2 · 2026-11-24 09:05, Latest, Change' }));
    expect(page.onOpenVersions).toHaveBeenCalledTimes(1);

    await renderPage(<RestoreBackupPage {...page} error='Incorrect backup password.' showOlderVersionHint versionSheetVisible />);
    expect(screen.getByText('Try an older version')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Choose another version' }));
    expect(page.onOpenVersions).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Choose a version')).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Revision 2 · 2026-11-24 09:05, Latest' }).props.accessibilityState).toMatchObject({ selected: true });
    await fireEvent.press(screen.getByRole('radio', { name: 'Revision 1 · 2026-11-20 10:00' }));
    expect(page.onSelectVersion).toHaveBeenCalledWith('v1');
  });

  it('hides the version picker for a backup with one version', async () => {
    await renderPage(<RestoreBackupPage {...props({ showOlderVersionHint: true, state: { kind: 'ready', backups: [{ id: 'a', label: 'Backup A' }], selectedId: 'a', versions: [{ id: 'a', label: 'Revision 1' }] } })} />);
    expect(screen.queryByTestId('restore-backup-version')).toBeNull();
    expect(screen.queryByTestId('restore-backup-choose-version')).toBeNull();
  });

  it('deletes a backup only after two confirmations', async () => {
    const page = props({ onDeleteBackup: jest.fn(), onConfirmDelete: jest.fn(), onCancelDelete: jest.fn() });

    await renderPage(<RestoreBackupPage {...page} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Delete Backup from 2026-11-24 09:05' }));
    expect(page.onDeleteBackup).toHaveBeenCalledWith('a');

    await renderPage(<RestoreBackupPage {...page} deleteStep='confirm' deleteLabel='Backup A' />);
    expect(screen.getByText('Delete this backup?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));

    await renderPage(<RestoreBackupPage {...page} deleteStep='confirmAgain' />);
    expect(screen.getByText('Delete permanently?')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Delete permanently' }));
    expect(page.onConfirmDelete).toHaveBeenCalledTimes(2);
  });

  it('keeps the backup password out of password managers', async () => {
    await renderPage(<RestoreBackupPage {...props()} />);
    expect(screen.getByTestId('restore-backup-password').props).toMatchObject({ textContentType: 'none', autoComplete: 'off', importantForAutofill: 'noExcludeDescendants' });
  });

  it('shows loading, empty and error states', async () => {
    await renderPage(<RestoreBackupPage {...props({ state: { kind: 'loading' } })} />);
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();

    const empty = props({ state: { kind: 'empty' }, emptyHint: 'iCloud may still be syncing.' });

    await renderPage(<RestoreBackupPage {...empty} />);
    expect(screen.getByText('No backup found')).toBeTruthy();
    expect(screen.getByText(/iCloud may still be syncing/)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Check again' }));
    expect(empty.onRetry).toHaveBeenCalledTimes(1);

    const page = props({ providerName: 'Google Drive', state: { kind: 'error', title: 'Not signed in to Google Drive', description: 'Allow access.' } });

    await renderPage(<RestoreBackupPage {...page} />);
    expect(screen.getByText('Not signed in to Google Drive')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(page.onRetry).toHaveBeenCalledTimes(1);
  });
});
