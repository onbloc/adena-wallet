import { createRequire } from 'node:module';
import path from 'path';

import { withPopupWindowGuard } from './popup-window-guard';

/**
 * Drives the real, unmodified `@web3auth/auth` PopupHandler — the code that
 * broke social login on Firefox — through the guard.
 *
 * It reads `this.window.closed` on a 500ms timer and calls `this.window.close()`
 * once the session socket has delivered the login result, both unguarded. On a
 * window Firefox has discarded those throw "can't access dead object": the
 * timer threw before it could clear itself, and the close threw out of
 * `listenOnChannel`, rejecting an authentication that had already succeeded.
 *
 * Deep imports are blocked by the package's `exports` map, hence the path
 * require. Nothing here patches the dependency; if upstream ever guards these
 * sites the test still passes.
 */
// Resolved the way the SDK itself loads it, so the test drives the copy the
// extension actually ships.
const sdkRequire = createRequire(createRequire(import.meta.url).resolve('@adena-wallet/sdk'));
const popupHandlerPath = path.join(
  path.dirname(sdkRequire.resolve('@web3auth/auth')),
  'core/PopupHandler.js',
);
const popupHandlerModule = sdkRequire(popupHandlerPath);

const PopupHandler = popupHandlerModule.default ?? popupHandlerModule;

const discardedWindow = (): Window =>
  new Proxy({} as Window, {
    get(): never {
      throw new TypeError('can’t access dead object');
    },
  });

const POPUP_TIMEOUT = 10;

type TestPopupHandler = {
  open: () => void;
  close: () => void;
  on: (event: string, listener: () => void) => void;
};

const openHandler = async (popup: Window | null): Promise<TestPopupHandler> => {
  window.open = vi.fn().mockReturnValue(popup) as unknown as typeof window.open;

  return withPopupWindowGuard(async () => {
    const handler: TestPopupHandler = new PopupHandler({
      url: 'https://example.test',
      timeout: POPUP_TIMEOUT,
    });
    handler.open();
    return handler;
  });
};

describe('web3auth PopupHandler behind withPopupWindowGuard', () => {
  const nativeOpen = window.open;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    window.open = nativeOpen;
  });

  it('polls a discarded window without throwing out of the timer', async () => {
    await openHandler(discardedWindow());

    expect(() => vi.advanceTimersByTime(500)).not.toThrow();
    expect(() => vi.advanceTimersByTime(5_000)).not.toThrow();
  });

  it('closes a discarded window without throwing', async () => {
    const handler = await openHandler(discardedWindow());

    expect(() => handler.close()).not.toThrow();
  });

  // Firefox discards the reference while the user is still signing in, so a
  // login in progress must never be reported as cancelled.
  it('does not cancel a login while the reference is merely discarded', async () => {
    const handler = await openHandler(discardedWindow());
    const onClose = vi.fn();
    handler.on('close', onClose);

    vi.advanceTimersByTime(60_000);

    expect(onClose).not.toHaveBeenCalled();
  });

  // The success path: the socket delivers and `listenOnChannel` closes the
  // popup, which is also what lets the handler's poll stop.
  it('does not report a finished login as cancelled once it closes the popup', async () => {
    const handler = await openHandler(discardedWindow());
    const onClose = vi.fn();
    handler.on('close', onClose);

    handler.close();
    vi.advanceTimersByTime(POPUP_TIMEOUT * 100);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('leaves a live popup to behave as it always has', async () => {
    const close = vi.fn();
    const handler = await openHandler({
      closed: false,
      close,
      focus: vi.fn(),
    } as unknown as Window);
    const onClose = vi.fn();
    handler.on('close', onClose);

    vi.advanceTimersByTime(5_000);
    expect(onClose).not.toHaveBeenCalled();

    handler.close();
    expect(close).toHaveBeenCalledTimes(1);
  });
});
