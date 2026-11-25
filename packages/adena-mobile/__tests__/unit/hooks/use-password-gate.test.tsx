import { act, renderHook, waitFor } from '@testing-library/react-native';

import { AppError, AppErrorCode } from '../../../src/core/errors';
import { PasswordGateOptions, usePasswordGate } from '../../../src/hooks/use-password-gate';
import { BiometryKind } from '../../../src/security/secure-store';
import { createWrapper } from '../../helpers/query-wrapper';

const PROMPT = { title: 'Confirm', cancel: 'Use password' };

const renderGate = async (action: (password: string) => Promise<void>, { enabled = false, readBiometricPassword = jest.fn(async () => 'escrowed'), options = {} as Partial<PasswordGateOptions> } = {}) => {
  const walletService = {
    getBiometryKind: jest.fn(async () => BiometryKind.FACE),
    isBiometricUnlockEnabled: jest.fn(async () => enabled),
    readBiometricPassword,
  };
  const { Wrapper } = createWrapper({ walletService });
  const rendered = await renderHook(() => usePasswordGate(action, { prompt: PROMPT, ...options }), { wrapper: Wrapper });

  // Lets the biometric status query settle.
  await act(async () => undefined);
  return { ...rendered, walletService };
};

describe('usePasswordGate', () => {
  it('opens, runs the action with the password and closes', async () => {
    const action = jest.fn().mockResolvedValue(undefined);
    const { result } = await renderGate(action);

    await act(async () => result.current.open());
    expect(result.current.sheetProps.visible).toBe(true);
    await act(async () => result.current.sheetProps.onChangePassword('secret'));
    await act(async () => result.current.sheetProps.onConfirm());
    expect(action).toHaveBeenCalledWith('secret');
    expect(result.current.sheetProps).toMatchObject({ visible: false, password: '', error: undefined, submitting: false });
  });

  it('ignores confirm without a password', async () => {
    const action = jest.fn();
    const { result } = await renderGate(action);

    await act(async () => result.current.sheetProps.onConfirm());
    expect(action).not.toHaveBeenCalled();
  });

  it('maps an invalid password and clears the error when typing', async () => {
    const action = jest.fn().mockRejectedValue(new AppError(AppErrorCode.INVALID_PASSWORD, 'bad'));
    const { result } = await renderGate(action);

    await act(async () => result.current.open());
    await act(async () => result.current.sheetProps.onChangePassword('wrong'));
    await act(async () => result.current.sheetProps.onConfirm());
    expect(result.current.sheetProps).toMatchObject({ visible: true, password: 'wrong', error: 'Incorrect password.', submitting: false });
    await act(async () => result.current.sheetProps.onChangePassword('wrong2'));
    expect(result.current.sheetProps.error).toBeUndefined();
  });

  it('shows other failures as their message, and the fallback for non-errors', async () => {
    const action = jest.fn().mockRejectedValueOnce(new Error('Keychain locked')).mockRejectedValueOnce('boom');
    const { result } = await renderGate(action);

    await act(async () => result.current.sheetProps.onChangePassword('pw'));
    await act(async () => result.current.sheetProps.onConfirm());
    expect(result.current.sheetProps.error).toBe('Keychain locked');
    await act(async () => result.current.sheetProps.onConfirm());
    expect(result.current.sheetProps.error).toBe('Something went wrong. Try again.');
  });

  it('ignores a second confirm while submitting', async () => {
    let finish: () => void = () => undefined;
    const action = jest.fn((_password: string) => new Promise<void>((resolve) => {
      finish = resolve;
    }));
    const { result } = await renderGate(action);

    await act(async () => result.current.sheetProps.onChangePassword('pw'));
    let first: Promise<void> = Promise.resolve();

    await act(async () => {
      first = result.current.sheetProps.onConfirm();
    });
    expect(result.current.sheetProps.submitting).toBe(true);
    await act(async () => result.current.sheetProps.onConfirm());
    expect(action).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish();
      await first;
    });
    expect(result.current.sheetProps.submitting).toBe(false);
  });

  it('runs the action once when confirm is called twice before a re-render', async () => {
    let finish: () => void = () => undefined;
    const action = jest.fn((_password: string) => new Promise<void>((resolve) => {
      finish = resolve;
    }));
    const { result } = await renderGate(action);

    await act(async () => result.current.sheetProps.onChangePassword('pw'));
    const { onConfirm } = result.current.sheetProps;

    await act(async () => {
      const first = onConfirm();
      const second = onConfirm();

      finish();
      await Promise.all([first, second]);
    });
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('closes and resets the form', async () => {
    const { result } = await renderGate(jest.fn());

    await act(async () => {
      result.current.open();
      result.current.sheetProps.onChangePassword('abc');
    });
    await act(async () => result.current.sheetProps.onClose());
    expect(result.current.sheetProps).toMatchObject({ visible: false, password: '' });
  });

  it('focuses the password field on open when biometric unlock is off', async () => {
    const { result, walletService } = await renderGate(jest.fn());

    await act(async () => result.current.open());
    expect(walletService.readBiometricPassword).not.toHaveBeenCalled();
    expect(result.current.sheetProps.biometric).toBeUndefined();
    expect(result.current.sheetProps.focusRequest).toBe(1);
  });
});

describe('usePasswordGate biometrics first', () => {
  it('prompts once on open and runs the action with the released password', async () => {
    const action = jest.fn().mockResolvedValue(undefined);
    const { result, walletService } = await renderGate(action, { enabled: true });

    await waitFor(() => expect(result.current.sheetProps.biometric).toMatchObject({ label: 'Face ID', icon: 'faceId' }));
    await act(async () => result.current.open());

    expect(walletService.readBiometricPassword).toHaveBeenCalledTimes(1);
    expect(walletService.readBiometricPassword).toHaveBeenCalledWith(PROMPT);
    expect(action).toHaveBeenCalledWith('escrowed');
    expect(result.current.sheetProps).toMatchObject({ visible: false, submitting: false, focusRequest: 0 });
  });

  it('falls back to the focused field after a cancel without looping, and retries from the button', async () => {
    const action = jest.fn().mockResolvedValue(undefined);
    const readBiometricPassword = jest.fn()
      .mockRejectedValueOnce(new AppError(AppErrorCode.BIOMETRICS_CANCELED, 'canceled'))
      .mockResolvedValueOnce('escrowed');
    const { result } = await renderGate(action, { enabled: true, readBiometricPassword });

    await act(async () => result.current.open());
    expect(result.current.sheetProps).toMatchObject({ visible: true, error: undefined, submitting: false, focusRequest: 1 });
    expect(readBiometricPassword).toHaveBeenCalledTimes(1);
    expect(action).not.toHaveBeenCalled();

    await act(async () => result.current.sheetProps.biometric?.onPress());
    expect(readBiometricPassword).toHaveBeenCalledTimes(2);
    expect(action).toHaveBeenCalledWith('escrowed');
    expect(result.current.sheetProps.visible).toBe(false);
  });

  it('explains a lockout or a stale escrowed password, and still accepts the typed password', async () => {
    const action = jest.fn().mockResolvedValue(undefined);
    const readBiometricPassword = jest.fn()
      .mockRejectedValueOnce(new AppError(AppErrorCode.BIOMETRICS_UNAVAILABLE, 'lockout'))
      .mockRejectedValueOnce(new AppError(AppErrorCode.INVALID_PASSWORD, 'stale'));
    const { result } = await renderGate(action, { enabled: true, readBiometricPassword });

    await act(async () => result.current.open());
    expect(result.current.sheetProps.error).toBe('Face ID is unavailable. Enter your password.');
    await act(async () => result.current.sheetProps.biometric?.onPress());
    expect(result.current.sheetProps.error).toBe('Biometric password is out of date. Enter your password.');
    expect(result.current.sheetProps.focusRequest).toBe(2);

    await act(async () => result.current.sheetProps.onChangePassword('typed'));
    await act(async () => result.current.sheetProps.onConfirm());
    expect(action).toHaveBeenCalledWith('typed');
  });

  it('prompts again on the next open, but not on re-renders', async () => {
    const readBiometricPassword = jest.fn().mockRejectedValue(new AppError(AppErrorCode.BIOMETRICS_CANCELED, 'canceled'));
    const { result, rerender } = await renderGate(jest.fn(), { enabled: true, readBiometricPassword });

    await act(async () => result.current.open());
    await rerender({});
    expect(readBiometricPassword).toHaveBeenCalledTimes(1);
    await act(async () => result.current.sheetProps.onClose());
    await act(async () => result.current.open());
    expect(readBiometricPassword).toHaveBeenCalledTimes(2);
  });

  it('drops a biometric result that lands after the sheet was closed', async () => {
    let release: (value: string) => void = () => undefined;
    const readBiometricPassword = jest.fn(() => new Promise<string>((resolve) => {
      release = resolve;
    }));
    const action = jest.fn().mockResolvedValue(undefined);
    const { result } = await renderGate(action, { enabled: true, readBiometricPassword });

    await act(async () => result.current.open());
    await act(async () => result.current.sheetProps.onClose());
    await act(async () => release('escrowed'));
    expect(action).not.toHaveBeenCalled();
  });

  it('never offers biometrics for a password that is not the wallet password', async () => {
    const { result, walletService } = await renderGate(jest.fn(), { enabled: true, options: { biometrics: false } });

    await act(async () => result.current.open());
    expect(result.current.sheetProps.biometric).toBeUndefined();
    expect(walletService.readBiometricPassword).not.toHaveBeenCalled();
    expect(result.current.sheetProps.focusRequest).toBe(1);
  });
});
