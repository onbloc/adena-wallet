import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import React, { createRef } from 'react';
import { Animated, Dimensions, Keyboard, KeyboardEvent, Platform, TextInput, TextInputInstance } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Button } from '../../../src/components/atoms';
import { BottomSheet, MnemonicGrid, PasswordSheet, TextField } from '../../../src/components/molecules';
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

describe('BottomSheet keyboard', () => {
  const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 34 } };
  const originalOS = Platform.OS;

  beforeEach(() => jest.useFakeTimers());

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    Platform.OS = originalOS;
  });

  const renderSheet = (onOpened = jest.fn(), onPress = jest.fn()) => render(
    <SafeAreaProvider initialMetrics={metrics}>
      <BottomSheet visible title='Sheet' onClose={jest.fn()} onOpened={onOpened}>
        <TextField label='Field' value='' onChangeText={jest.fn()} returnKeyType='done' testID='sheet-field' />
        <Button label='Act' onPress={onPress} />
      </BottomSheet>
    </SafeAreaProvider>,
  );

  it('reports onOpened once the open animation settles', async () => {
    const onOpened = jest.fn();

    await renderSheet(onOpened);
    expect(onOpened).not.toHaveBeenCalled();
    await act(async () => {
      jest.runAllTimers();
    });
    expect(onOpened).toHaveBeenCalledTimes(1);
  });

  it('follows the iOS keyboard frame with the keyboard\'s own duration and curve', async () => {
    const handlers: Record<string, (event: KeyboardEvent) => void> = {};

    jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, handler: (event: KeyboardEvent) => void) => {
      handlers[event] = handler;
      return { remove: jest.fn() };
    }) as unknown as typeof Keyboard.addListener);
    const timing = jest.spyOn(Animated, 'timing');

    await renderSheet();
    const frame = { screenX: 0, screenY: Dimensions.get('screen').height - 336, width: 390, height: 336 };

    timing.mockClear();
    await act(async () => handlers.keyboardWillChangeFrame({ duration: 250, easing: 'keyboard', endCoordinates: frame, startCoordinates: frame } as KeyboardEvent));
    // Lifted by the keyboard height minus the home indicator inset the sheet already pads for.
    expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: 302, duration: 250, useNativeDriver: true }));

    timing.mockClear();
    await act(async () => handlers.keyboardWillHide({ duration: 200, easing: 'keyboard', endCoordinates: frame, startCoordinates: frame } as KeyboardEvent));
    expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: 0, duration: 200 }));
  });

  it('lifts on Android from the modal\'s soft input height, and moves on focus once the height is known', async () => {
    Platform.OS = 'android';
    const timing = jest.spyOn(Animated, 'timing');
    const { container } = await renderSheet();
    const source = container.queryAll(node => typeof node.props.onSoftInputHeightChange === 'function')[0];

    expect(source.props.enabled).toBe(false);
    timing.mockClear();
    await act(async () => source.props.onSoftInputHeightChange({ nativeEvent: { softInputHeight: 280 } }));
    expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: 280, useNativeDriver: true }));

    await act(async () => source.props.onSoftInputHeightChange({ nativeEvent: { softInputHeight: 0 } }));
    timing.mockClear();
    await fireEvent(screen.getByTestId('sheet-field'), 'focus');
    expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: 280 }));

    // A hardware keyboard never reports a height: the guess is undone.
    timing.mockClear();
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: 0 }));
  });

  it('dismisses the keyboard of its own field when the sheet closes, and leaves other fields alone', async () => {
    const dismiss = jest.spyOn(Keyboard, 'dismiss');
    const currentlyFocused = jest.spyOn(TextInput.State, 'currentlyFocusedInput');
    const sheet = (visible: boolean) => (
      <SafeAreaProvider initialMetrics={metrics}>
        <BottomSheet visible={visible} title='Sheet' onClose={jest.fn()}>
          <TextField label='Field' value='' onChangeText={jest.fn()} returnKeyType='done' testID='sheet-field' />
        </BottomSheet>
      </SafeAreaProvider>
    );
    const sheetInput = { id: 'sheet' } as unknown as ReturnType<typeof TextInput.State.currentlyFocusedInput>;
    const screenInput = { id: 'screen' } as unknown as ReturnType<typeof TextInput.State.currentlyFocusedInput>;
    const { rerender } = await render(sheet(false));

    // A hidden sheet mounting next to an autofocused field must not take its keyboard away.
    expect(dismiss).not.toHaveBeenCalled();
    await rerender(sheet(true));
    currentlyFocused.mockReturnValue(sheetInput);
    await fireEvent(screen.getByTestId('sheet-field', { includeHiddenElements: true }), 'focus');
    await rerender(sheet(false));
    expect(dismiss).toHaveBeenCalledTimes(1);

    await rerender(sheet(true));
    await fireEvent(screen.getByTestId('sheet-field', { includeHiddenElements: true }), 'focus');
    // The screen below focuses its own field while the sheet closes.
    currentlyFocused.mockReturnValue(screenInput);
    await rerender(sheet(false));
    expect(dismiss).toHaveBeenCalledTimes(1);
  });
});
