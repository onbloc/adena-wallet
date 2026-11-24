import { act, renderHook } from '@testing-library/react-native';

import { AppError, AppErrorCode } from '../../../src/core/errors';
import { usePasswordGate } from '../../../src/hooks/use-password-gate';

describe('usePasswordGate', () => {
  it('opens, runs the action with the password and closes', async () => {
    const action = jest.fn().mockResolvedValue(undefined);
    const { result } = await renderHook(() => usePasswordGate(action));

    await act(async () => result.current.open());
    expect(result.current.sheetProps.visible).toBe(true);
    await act(async () => result.current.sheetProps.onChangePassword('secret'));
    await act(async () => result.current.sheetProps.onConfirm());
    expect(action).toHaveBeenCalledWith('secret');
    expect(result.current.sheetProps).toMatchObject({ visible: false, password: '', error: undefined, submitting: false });
  });

  it('ignores confirm without a password', async () => {
    const action = jest.fn();
    const { result } = await renderHook(() => usePasswordGate(action));

    await act(async () => result.current.sheetProps.onConfirm());
    expect(action).not.toHaveBeenCalled();
  });

  it('maps an invalid password and clears the error when typing', async () => {
    const action = jest.fn().mockRejectedValue(new AppError(AppErrorCode.INVALID_PASSWORD, 'bad'));
    const { result } = await renderHook(() => usePasswordGate(action));

    await act(async () => result.current.open());
    await act(async () => result.current.sheetProps.onChangePassword('wrong'));
    await act(async () => result.current.sheetProps.onConfirm());
    expect(result.current.sheetProps).toMatchObject({ visible: true, password: 'wrong', error: 'Incorrect password.', submitting: false });
    await act(async () => result.current.sheetProps.onChangePassword('wrong2'));
    expect(result.current.sheetProps.error).toBeUndefined();
  });

  it('shows other failures as their message, and the fallback for non-errors', async () => {
    const action = jest.fn().mockRejectedValueOnce(new Error('Keychain locked')).mockRejectedValueOnce('boom');
    const { result } = await renderHook(() => usePasswordGate(action));

    await act(async () => result.current.sheetProps.onChangePassword('pw'));
    await act(async () => result.current.sheetProps.onConfirm());
    expect(result.current.sheetProps.error).toBe('Keychain locked');
    await act(async () => result.current.sheetProps.onConfirm());
    expect(result.current.sheetProps.error).toBe('Something went wrong. Try again.');
  });

  it('ignores a second confirm while submitting', async () => {
    let finish: () => void = () => undefined;
    const action = jest.fn(() => new Promise<void>((resolve) => {
      finish = resolve;
    }));
    const { result } = await renderHook(() => usePasswordGate(action));

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
    const action = jest.fn(() => new Promise<void>((resolve) => {
      finish = resolve;
    }));
    const { result } = await renderHook(() => usePasswordGate(action));

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
    const { result } = await renderHook(() => usePasswordGate(jest.fn()));

    await act(async () => {
      result.current.open();
      result.current.sheetProps.onChangePassword('abc');
    });
    await act(async () => result.current.sheetProps.onClose());
    expect(result.current.sheetProps).toMatchObject({ visible: false, password: '' });
  });
});
