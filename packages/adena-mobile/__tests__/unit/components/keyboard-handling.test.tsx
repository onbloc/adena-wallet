import { fireEvent, screen } from '@testing-library/react-native';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import React, { createRef } from 'react';
import { Platform, TextInputInstance } from 'react-native';

import { MnemonicGrid, PasswordSheet, TextField } from '../../../src/components/molecules';
import { AddNetworkPage, AddressBookEditPage, ChangePasswordPage, CreatePasswordPage, ImportWalletPage, UnlockPage } from '../../../src/components/pages';
import { SecretImportMode } from '../../../src/domain/account';
import { focusedTestIds, focusMock } from '../../helpers/focus';
import { renderPage, wrapPage } from './pages/render-page';

const SRC = join(__dirname, '../../../src');

const sourceFiles = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);

  if (statSync(path).isDirectory()) {
    return sourceFiles(path);
  }

  return /\.tsx$/.test(name) && !/\.stories\.tsx$/.test(name) ? [path] : [];
});

// Each JSX opening tag of `tag`, up to its closing `>` or `/>`.
const openingTags = (source: string, tag: string): string[] => {
  const tags: string[] = [];
  const pattern = new RegExp(`<${tag}[\\s>]`, 'g');

  for (let match = pattern.exec(source); match; match = pattern.exec(source)) {
    let depth = 0;
    let end = match.index;

    for (; end < source.length; end += 1) {
      const char = source[end];

      if (char === '{') {
        depth += 1;
      }
      else if (char === '}') {
        depth -= 1;
      }
      else if (char === '>' && depth === 0 && source[end - 1] !== '=') {
        break;
      }
    }

    tags.push(source.slice(match.index, end + 1));
  }

  return tags;
};

describe('keyboard handling across the app', () => {
  const files = sourceFiles(SRC).map(path => ({ path, source: readFileSync(path, 'utf8') }));

  it('lets taps reach buttons while the keyboard is up in every scroll container', () => {
    const tags = files.flatMap(({ path, source }) => ['ScrollView', 'FlatList', 'SectionList'].flatMap(tag => openingTags(source, tag).map(open => ({ path, open }))));

    expect(tags.length).toBeGreaterThanOrEqual(5);
    expect(tags.filter(({ open }) => !open.includes('keyboardShouldPersistTaps=\'handled\'')).map(({ path }) => path)).toEqual([]);
  });

  it('gives every text field a return key that matches its next step', () => {
    const tags = files
      .filter(({ path }) => !path.includes('/molecules/text-field/'))
      .flatMap(({ path, source }) => openingTags(source, 'TextField').map(open => ({ path, open })));

    expect(tags.length).toBeGreaterThanOrEqual(15);
    expect(tags.filter(({ open }) => !open.includes('returnKeyType')).map(({ path }) => path)).toEqual([]);
  });
});

describe('TextField', () => {
  beforeEach(() => focusMock().mockClear());

  it('forwards its ref to the input so forms can chain focus', async () => {
    const ref = createRef<TextInputInstance>();

    await renderPage(<TextField ref={ref} label='Name' value='' onChangeText={jest.fn()} returnKeyType='next' testID='name' />);
    ref.current?.focus();
    expect(focusedTestIds()).toEqual(['name']);
  });

  it('turns off capitalization and correction for secrets', async () => {
    await renderPage(<TextField label='Password' value='' onChangeText={jest.fn()} secure returnKeyType='done' testID='secret' />);
    expect(screen.getByTestId('secret').props).toMatchObject({ autoCapitalize: 'none', autoCorrect: false, spellCheck: false, secureTextEntry: true });
  });
});

describe('secrets stay out of password managers and keyboard learning', () => {
  const NO_AUTOFILL = {
    textContentType: 'none',
    autoComplete: 'off',
    importantForAutofill: 'noExcludeDescendants',
    autoCorrect: false,
    spellCheck: false,
    autoCapitalize: 'none',
  };
  const originalOS = Platform.OS;

  afterEach(() => {
    Platform.OS = originalOS;
  });

  it.each([SecretImportMode.MNEMONIC, SecretImportMode.PRIVATE_KEY])('import %s: unmasked, never autofilled or saved', async (mode) => {
    await renderPage(<ImportWalletPage mode={mode} secret='' onChangeSecret={jest.fn()} accountName='' onChangeAccountName={jest.fn()} onSubmit={jest.fn()} onBack={jest.fn()} />);

    // A secure field beside the account name would read as a login form to iOS.
    expect(screen.getByTestId('import-secret').props).toMatchObject({ ...NO_AUTOFILL, secureTextEntry: false });
    expect(screen.getByTestId('import-account-name').props).toMatchObject({ textContentType: 'none', autoComplete: 'off' });
  });

  it('uses a visible-password keyboard on Android for phrases, never for masked fields', async () => {
    Platform.OS = 'android';
    await renderPage(<ImportWalletPage mode={SecretImportMode.MNEMONIC} secret='' onChangeSecret={jest.fn()} onSubmit={jest.fn()} onBack={jest.fn()} />);
    expect(screen.getByTestId('import-secret').props.keyboardType).toBe('visible-password');
  });

  it('keeps the regular keyboard for masked fields on Android', async () => {
    Platform.OS = 'android';
    await renderPage(<TextField label='Password' value='' onChangeText={jest.fn()} secure returnKeyType='done' testID='secret' />);
    expect(screen.getByTestId('secret').props.keyboardType).toBeUndefined();
  });

  it('keeps wallet password fields out of autofill, even when a caller asks for it', async () => {
    await renderPage(<TextField label='Password' value='' onChangeText={jest.fn()} secure textContentType='password' autoComplete='current-password' returnKeyType='done' testID='secret' />);
    expect(screen.getByTestId('secret').props).toMatchObject(NO_AUTOFILL);
  });

  it('keeps unlock and the password sheet out of autofill', async () => {
    await renderPage(<UnlockPage password='' onChangePassword={jest.fn()} submitting={false} onUnlock={jest.fn()} onResetWallet={jest.fn()} />);
    expect(screen.getByTestId('unlock-password').props).toMatchObject(NO_AUTOFILL);
  });

  it('keeps the password sheet out of autofill', async () => {
    await renderPage(<PasswordSheet visible title='t' password='' onChangePassword={jest.fn()} submitting={false} onConfirm={jest.fn()} onClose={jest.fn()} />);
    expect(screen.getByTestId('password-sheet-input', { includeHiddenElements: true }).props).toMatchObject(NO_AUTOFILL);
  });

  it('never lets the revealed phrase be selected or copied outside the Copy button', async () => {
    await renderPage(<MnemonicGrid words={['alpha', 'beta']} />);
    expect(screen.getByText('alpha').props.selectable).toBe(false);
    expect(screen.getByText('beta').props.selectable).toBe(false);
  });
});

describe('form submit chaining', () => {
  beforeEach(() => focusMock().mockClear());

  it('create password: next moves to the confirmation, done submits only when both are filled', async () => {
    const onSubmit = jest.fn();
    const base = { onChangePassword: jest.fn(), onChangeConfirmPassword: jest.fn(), submitting: false, onSubmit, onBack: jest.fn() };
    const { rerender } = await renderPage(<CreatePasswordPage {...base} password='first' confirmPassword='' />);

    await fireEvent(screen.getByTestId('password-input'), 'submitEditing');
    expect(focusedTestIds()).toContain('password-confirm');
    await fireEvent(screen.getByTestId('password-confirm'), 'submitEditing');
    expect(onSubmit).not.toHaveBeenCalled();

    await rerender(wrapPage(<CreatePasswordPage {...base} password='first' confirmPassword='first' />));
    await fireEvent(screen.getByTestId('password-confirm'), 'submitEditing');
    expect(onSubmit).toHaveBeenCalledTimes(1);

    await rerender(wrapPage(<CreatePasswordPage {...base} password='first' confirmPassword='first' submitting />));
    await fireEvent(screen.getByTestId('password-confirm'), 'submitEditing');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('change password: current → new → confirm → submit', async () => {
    const onSubmit = jest.fn();
    const props = {
      currentPassword: 'old',
      newPassword: 'new password',
      confirmPassword: 'new password',
      onChangeCurrentPassword: jest.fn(),
      onChangeNewPassword: jest.fn(),
      onChangeConfirmPassword: jest.fn(),
      biometricEnabled: false,
      onToggleBiometric: jest.fn(),
      submitting: false,
      onSubmit,
      onBack: jest.fn(),
    };

    await renderPage(<ChangePasswordPage {...props} />);
    await fireEvent(screen.getByTestId('current-password-input'), 'submitEditing');
    await fireEvent(screen.getByTestId('new-password-input'), 'submitEditing');
    expect(focusedTestIds()).toEqual(['new-password-input', 'new-password-confirm']);
    await fireEvent(screen.getByTestId('new-password-confirm'), 'submitEditing');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('change password: a biometric-verified current password replaces the field', async () => {
    const onPress = jest.fn();
    const props = {
      currentPassword: '',
      newPassword: 'n',
      confirmPassword: 'n',
      onChangeCurrentPassword: jest.fn(),
      onChangeNewPassword: jest.fn(),
      onChangeConfirmPassword: jest.fn(),
      biometricEnabled: true,
      onToggleBiometric: jest.fn(),
      submitting: false,
      onSubmit: jest.fn(),
      onBack: jest.fn(),
    };
    const { rerender } = await renderPage(<ChangePasswordPage {...props} currentBiometric={{ label: 'Face ID', icon: 'faceId', onPress }} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Use Face ID' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('change-password-submit').props.accessibilityState).toMatchObject({ disabled: true });

    await rerender(wrapPage(<ChangePasswordPage {...props} currentVerifiedWith='Face ID' />));
    expect(screen.queryByTestId('current-password-input')).toBeNull();
    expect(screen.getByText('Current password verified with Face ID')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('change-password-submit'));
    expect(props.onSubmit).toHaveBeenCalledTimes(1);
  });

  it('add network: name → endpoint → submit when valid', async () => {
    const onSubmit = jest.fn();
    const props = {
      name: 'Node',
      rpcUrl: '',
      baseNetworkName: 'Gno.land',
      endpointLabel: 'RPC URL',
      onChangeName: jest.fn(),
      onChangeRpcUrl: jest.fn(),
      onSelectBaseNetwork: jest.fn(),
      submitting: false,
      onSubmit,
      onBack: jest.fn(),
    };
    const { rerender } = await renderPage(<AddNetworkPage {...props} />);

    expect(screen.getByLabelText('RPC URL').props).toMatchObject({ keyboardType: 'url', autoCapitalize: 'none', autoCorrect: false, returnKeyType: 'go' });
    await fireEvent(screen.getByLabelText('Network name'), 'submitEditing');
    expect(focusMock()).toHaveBeenCalledTimes(1);
    await fireEvent(screen.getByLabelText('RPC URL'), 'submitEditing');
    expect(onSubmit).not.toHaveBeenCalled();

    await rerender(wrapPage(<AddNetworkPage {...props} rpcUrl='https://rpc.example.com' />));
    await fireEvent(screen.getByLabelText('RPC URL'), 'submitEditing');
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('address book: name → address → save when both are set', async () => {
    const onSave = jest.fn();
    const props = { mode: 'add' as const, name: 'Alice', address: 'g1abc', onChangeName: jest.fn(), onChangeAddress: jest.fn(), addressPlaceholder: 'g1…', onSave, onBack: jest.fn() };

    await renderPage(<AddressBookEditPage {...props} />);
    await fireEvent(screen.getByLabelText('Name'), 'submitEditing');
    expect(focusMock()).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Address').props).toMatchObject({ autoCapitalize: 'none', autoCorrect: false, returnKeyType: 'done' });
    await fireEvent(screen.getByLabelText('Address'), 'submitEditing');
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
