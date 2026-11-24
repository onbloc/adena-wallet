import Clipboard from '@react-native-clipboard/clipboard';
import { act, cleanup, renderHook } from '@testing-library/react-native';
import { AppState, AppStateStatus } from 'react-native';

import { SENSITIVE_CLIPBOARD_TTL_MS, useSensitiveClipboard } from '../../../src/hooks/use-sensitive-clipboard';
import { useToastStore } from '../../../src/stores/toast.store';

const SECRET = 'abandon ability able about above absent absorb abstract absurd abuse access accident';

describe('useSensitiveClipboard', () => {
  let appStateListeners: ((state: AppStateStatus) => void)[];
  const emitAppState = (state: AppStateStatus): void => appStateListeners.forEach(listener => listener(state));

  beforeEach(() => {
    jest.useFakeTimers();
    appStateListeners = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
      appStateListeners.push(handler as (state: AppStateStatus) => void);
      return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
    });
    useToastStore.setState({ toast: null });
  });

  afterEach(async () => {
    await cleanup();
    jest.useRealTimers();
    jest.restoreAllMocks();
    jest.mocked(Clipboard.setString).mockClear();
    jest.mocked(Clipboard.getString).mockReset().mockResolvedValue('');
  });

  const renderAndCopy = async (ttlMs?: number) => {
    const hook = await renderHook(({ ttl }: { ttl?: number }) => useSensitiveClipboard(ttl), { initialProps: { ttl: ttlMs } });

    await act(async () => hook.result.current.copy(SECRET, 'Copied'));
    expect(Clipboard.setString).toHaveBeenLastCalledWith(SECRET);
    return hook;
  };

  it('copies the secret and shows a toast', async () => {
    await renderAndCopy();

    expect(Clipboard.setString).toHaveBeenCalledTimes(1);
    expect(useToastStore.getState().toast).toMatchObject({ message: 'Copied', tone: 'success' });
  });

  it('wipes the secret when the TTL fires while active and the clipboard still holds it', async () => {
    await renderAndCopy();
    jest.mocked(Clipboard.getString).mockResolvedValue(SECRET);

    await act(async () => jest.advanceTimersByTime(SENSITIVE_CLIPBOARD_TTL_MS));

    expect(Clipboard.setString).toHaveBeenLastCalledWith('');
    expect(Clipboard.setString).toHaveBeenCalledTimes(2);
  });

  it('leaves replaced clipboard content alone when the TTL fires', async () => {
    await renderAndCopy();
    jest.mocked(Clipboard.getString).mockResolvedValue('something else');

    await act(async () => jest.advanceTimersByTime(SENSITIVE_CLIPBOARD_TTL_MS));

    expect(Clipboard.setString).toHaveBeenCalledTimes(1);
  });

  it.each<AppStateStatus>(['inactive', 'background'])('keeps the secret on %s so it can be pasted elsewhere', async (state) => {
    await renderAndCopy();

    await act(async () => emitAppState(state));
    await act(async () => jest.advanceTimersByTime(SENSITIVE_CLIPBOARD_TTL_MS - 1));

    expect(Clipboard.setString).toHaveBeenCalledTimes(1);
  });

  it('defers an expiry missed in the background to the next active, then forgets the secret', async () => {
    await renderAndCopy();
    await act(async () => emitAppState('background'));
    await act(async () => jest.advanceTimersByTime(SENSITIVE_CLIPBOARD_TTL_MS));
    expect(Clipboard.getString).not.toHaveBeenCalled();
    expect(Clipboard.setString).toHaveBeenCalledTimes(1);

    jest.mocked(Clipboard.getString).mockResolvedValue(SECRET);
    await act(async () => emitAppState('active'));
    expect(Clipboard.setString).toHaveBeenLastCalledWith('');
    expect(Clipboard.setString).toHaveBeenCalledTimes(2);

    await act(async () => emitAppState('background'));
    await act(async () => emitAppState('active'));
    expect(Clipboard.getString).toHaveBeenCalledTimes(1);
    expect(Clipboard.setString).toHaveBeenCalledTimes(2);
  });

  it('does not wipe unrelated content on the next active after a missed expiry', async () => {
    await renderAndCopy();
    await act(async () => emitAppState('background'));
    await act(async () => jest.advanceTimersByTime(SENSITIVE_CLIPBOARD_TTL_MS));

    jest.mocked(Clipboard.getString).mockResolvedValue('something else');
    await act(async () => emitAppState('active'));

    expect(Clipboard.setString).toHaveBeenCalledTimes(1);
  });

  it('clear() wipes immediately inside the window and cancels the timer', async () => {
    const { result } = await renderAndCopy();

    await act(async () => result.current.clear());
    expect(Clipboard.setString).toHaveBeenLastCalledWith('');
    expect(Clipboard.getString).not.toHaveBeenCalled();

    await act(async () => jest.advanceTimersByTime(SENSITIVE_CLIPBOARD_TTL_MS));
    expect(Clipboard.setString).toHaveBeenCalledTimes(2);
  });

  it('clear() after the window only wipes the secret if the clipboard still holds it', async () => {
    const { result } = await renderAndCopy();

    jest.setSystemTime(Date.now() + SENSITIVE_CLIPBOARD_TTL_MS);
    jest.mocked(Clipboard.getString).mockResolvedValue('something else');
    await act(async () => result.current.clear());

    expect(Clipboard.setString).toHaveBeenCalledTimes(1);
  });

  it('wipes on unmount inside the window', async () => {
    const { unmount } = await renderAndCopy();

    await act(async () => emitAppState('background'));
    await unmount();

    expect(Clipboard.setString).toHaveBeenLastCalledWith('');
    expect(Clipboard.setString).toHaveBeenCalledTimes(2);
  });

  it('does not wipe on unmount once the window has passed', async () => {
    const { unmount } = await renderAndCopy();

    jest.setSystemTime(Date.now() + SENSITIVE_CLIPBOARD_TTL_MS);
    await unmount();

    expect(Clipboard.setString).toHaveBeenCalledTimes(1);
  });

  it('does not wipe when a re-render changes the TTL', async () => {
    const { rerender } = await renderAndCopy();

    await rerender({ ttl: SENSITIVE_CLIPBOARD_TTL_MS * 2 });

    expect(Clipboard.setString).toHaveBeenCalledTimes(1);
  });
});
