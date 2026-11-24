import { act, fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { Keyboard, KeyboardEvent } from 'react-native';

import { CloudBackupPage, CloudBackupPageProps, InjectSheetPage, InjectSheetPageProps, RestoreBackupPage, RestoreBackupPageProps, SheetAuthMode } from '../../../../src/components/pages';
import { focusedTestIds, focusMock } from '../../../helpers/focus';
import { renderPage, wrapPage } from './render-page';

const sheet = () => ({ visible: false, password: '', onChangePassword: jest.fn(), submitting: false, onConfirm: jest.fn(), onClose: jest.fn() });

const cloudProps = (overrides: Partial<CloudBackupPageProps> = {}): CloudBackupPageProps => ({
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

const backupForm = (overrides: Partial<NonNullable<CloudBackupPageProps['backupForm']>> = {}) => ({
  password: 'violet orbit lantern 42',
  confirmPassword: '',
  onChangePassword: jest.fn(),
  onChangeConfirmPassword: jest.fn(),
  submitting: false,
  onSubmit: jest.fn(),
  ...overrides,
});

const injectProps = (overrides: Partial<InjectSheetPageProps> = {}): InjectSheetPageProps => ({
  title: 'Approve transaction',
  rows: [],
  messages: [],
  loading: false,
  approveLabel: 'Approve',
  approving: false,
  canApprove: true,
  onApprove: jest.fn(),
  onReject: jest.fn(),
  ...overrides,
});

describe('backup password form', () => {
  beforeEach(() => focusMock().mockClear());

  it('focuses the first field, moves next to the confirmation and submits when both are filled', async () => {
    const form = backupForm();
    const { rerender } = await renderPage(<CloudBackupPage {...cloudProps({ backupForm: form })} />);

    expect(screen.getByTestId('backup-password-input').props).toMatchObject({ autoFocus: true, returnKeyType: 'next', textContentType: 'none' });
    await fireEvent(screen.getByTestId('backup-password-input'), 'submitEditing');
    expect(focusedTestIds()).toEqual(['backup-password-confirm']);
    await fireEvent(screen.getByTestId('backup-password-confirm'), 'submitEditing');
    expect(form.onSubmit).not.toHaveBeenCalled();

    const filled = backupForm({ confirmPassword: 'violet orbit lantern 42' });

    await rerender(wrapPage(<CloudBackupPage {...cloudProps({ backupForm: filled })} />));
    await fireEvent(screen.getByTestId('backup-password-confirm'), 'submitEditing');
    expect(filled.onSubmit).toHaveBeenCalledTimes(1);

    const busy = backupForm({ confirmPassword: 'violet orbit lantern 42', submitting: true });

    await rerender(wrapPage(<CloudBackupPage {...cloudProps({ backupForm: busy })} />));
    await fireEvent(screen.getByTestId('backup-password-confirm'), 'submitEditing');
    expect(busy.onSubmit).not.toHaveBeenCalled();
  });
});

describe('restore backup password', () => {
  const restoreProps = (overrides: Partial<RestoreBackupPageProps> = {}): RestoreBackupPageProps => ({
    providerName: 'iCloud',
    state: { kind: 'ready', backups: [{ id: 'a', label: 'Backup' }], selectedId: 'a' },
    onSelect: jest.fn(),
    password: '',
    onChangePassword: jest.fn(),
    submitting: false,
    onSubmit: jest.fn(),
    onRetry: jest.fn(),
    onBack: jest.fn(),
    ...overrides,
  });

  it('submits from the keyboard only with a password and not while decrypting', async () => {
    const empty = restoreProps();
    const { rerender } = await renderPage(<RestoreBackupPage {...empty} />);

    expect(screen.getByTestId('restore-backup-password').props).toMatchObject({ returnKeyType: 'go', submitBehavior: 'submit' });
    await fireEvent(screen.getByTestId('restore-backup-password'), 'submitEditing');
    expect(empty.onSubmit).not.toHaveBeenCalled();

    const busy = restoreProps({ password: 'secret', submitting: true });

    await rerender(wrapPage(<RestoreBackupPage {...busy} />));
    await fireEvent(screen.getByTestId('restore-backup-password'), 'submitEditing');
    expect(busy.onSubmit).not.toHaveBeenCalled();

    const ready = restoreProps({ password: 'secret' });

    await rerender(wrapPage(<RestoreBackupPage {...ready} />));
    await fireEvent(screen.getByTestId('restore-backup-password'), 'submitEditing');
    expect(ready.onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe('inject sheet password', () => {
  afterEach(() => jest.restoreAllMocks());

  it('approves from the return key only when approval is possible, and shows the fallback reason', async () => {
    const auth = { mode: SheetAuthMode.PASSWORD, password: 'pw', onChangePassword: jest.fn(), passwordError: 'Fingerprint is unavailable. Enter your password.' };
    const blocked = injectProps({ auth, canApprove: false });
    const { rerender } = await renderPage(<InjectSheetPage {...blocked} />);

    expect(screen.getByText('Fingerprint is unavailable. Enter your password.')).toBeTruthy();
    expect(screen.getByTestId('inject-sheet-password').props).toMatchObject({ returnKeyType: 'go', secureTextEntry: true });
    await fireEvent(screen.getByTestId('inject-sheet-password'), 'submitEditing');
    expect(blocked.onApprove).not.toHaveBeenCalled();

    const ready = injectProps({ auth });

    await rerender(wrapPage(<InjectSheetPage {...ready} />));
    await fireEvent(screen.getByTestId('inject-sheet-password'), 'submitEditing');
    expect(ready.onApprove).toHaveBeenCalledTimes(1);
  });

  it('pads the sheet above the keyboard, since the edge-to-edge activity is not resized', async () => {
    const handlers: Record<string, (event: KeyboardEvent) => void> = {};

    jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, handler: (event: KeyboardEvent) => void) => {
      handlers[event] = handler;
      return { remove: jest.fn() };
    }) as unknown as typeof Keyboard.addListener);
    const auth = { mode: SheetAuthMode.PASSWORD, password: '', onChangePassword: jest.fn() };
    const { container } = await renderPage(<InjectSheetPage {...injectProps({ auth })} />);
    const sheetPadding = (): number => {
      const sheetView = container.queryAll(node => node.props.accessibilityViewIsModal === true)[0];

      return ([] as { paddingBottom?: number }[]).concat(sheetView.props.style).reduce((value, style) => style?.paddingBottom ?? value, 0);
    };

    expect(sheetPadding()).toBe(24);
    await act(async () => handlers.keyboardDidShow({ endCoordinates: { height: 300, screenX: 0, screenY: 0, width: 390 } } as KeyboardEvent));
    expect(sheetPadding()).toBe(316);
    await act(async () => handlers.keyboardDidHide({ endCoordinates: { height: 0, screenX: 0, screenY: 0, width: 390 } } as KeyboardEvent));
    expect(sheetPadding()).toBe(24);
  });
});
