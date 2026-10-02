import { withPopupWindowGuard } from './popup-window-guard';

/** A WindowProxy the browser has discarded: every access throws. */
const discardedWindow = (): Window =>
  new Proxy({} as Window, {
    get(): never {
      throw new TypeError('can’t access dead object');
    },
  });

const liveWindow = (close = jest.fn()): Window =>
  ({ closed: false, close, focus: jest.fn() }) as unknown as Window;

describe('withPopupWindowGuard', () => {
  const nativeOpen = window.open;

  afterEach(() => {
    window.open = nativeOpen;
  });

  const openDuring = async (popup: Window | null): Promise<Window | null> => {
    window.open = jest.fn().mockReturnValue(popup) as unknown as typeof window.open;

    let opened: Window | null = null;
    await withPopupWindowGuard(async () => {
      opened = window.open('https://example.test');
    });

    return opened;
  };

  // Firefox discards the reference on the cross-process navigation to the
  // provider, with the user still signing in. Reading that as "closed" is what
  // made the handler reject a login in progress.
  it('does not claim a discarded window was closed', async () => {
    const opened = await openDuring(discardedWindow());

    expect(opened?.closed).toBe(false);
  });

  // The close the opener asked for is true by construction, and reporting it
  // is what lets the handler's poll stop.
  it('reports closed once the opener has closed it', async () => {
    const opened = await openDuring(discardedWindow());

    opened?.close();

    expect(opened?.closed).toBe(true);
  });

  it('makes closing a discarded window a no-op', async () => {
    const opened = await openDuring(discardedWindow());

    expect(() => opened?.close()).not.toThrow();
    expect(() => opened?.focus()).not.toThrow();
  });

  it('reads anything else on a discarded window as undefined', async () => {
    const opened = await openDuring(discardedWindow());

    expect((opened as unknown as Record<string, unknown>)?.location).toBeUndefined();
  });

  it('passes a live window straight through', async () => {
    const close = jest.fn();
    const opened = await openDuring(liveWindow(close));

    expect(opened?.closed).toBe(false);
    opened?.close();
    expect(close).toHaveBeenCalledTimes(1);
  });

  // Nothing throws on Chrome, so the wrapper has to be indistinguishable from
  // the window it stands in for — not just for the reads the SDK happens to do.
  describe('on a browser that never discards the reference', () => {
    class FakeWindow {
      public closed = false;
      public marker = 'original';
      public close = jest.fn();
    }

    const live = new FakeWindow();

    const wrapped = async (): Promise<FakeWindow> =>
      (await openDuring(live as unknown as Window)) as unknown as FakeWindow;

    it('reads through to the real window', async () => {
      live.closed = true;
      expect((await wrapped()).closed).toBe(true);

      live.closed = false;
      expect((await wrapped()).closed).toBe(false);
    });

    it('writes through to the real window', async () => {
      (await wrapped()).marker = 'written';

      expect(live.marker).toBe('written');
    });

    it('answers `in` from the real window', async () => {
      const target = await wrapped();

      expect('closed' in target).toBe(true);
      expect('neverDefined' in target).toBe(false);
    });

    it('keeps the real window prototype, so instanceof still holds', async () => {
      expect(await wrapped()).toBeInstanceOf(FakeWindow);
    });

    it('calls methods on the real window', async () => {
      (await wrapped()).close();

      expect(live.close).toHaveBeenCalledTimes(1);
      expect(live.close.mock.instances[0]).toBe(live);
    });
  });

  // `PopupHandler` throws `popupBlocked` on a falsy return, so a blocked
  // popup must not come back as a truthy wrapper.
  it('leaves a blocked popup null', async () => {
    const opened = await openDuring(null);

    expect(opened).toBeNull();
  });

  it('restores window.open afterwards, including when the task throws', async () => {
    const stub = jest.fn() as unknown as typeof window.open;
    window.open = stub;

    await withPopupWindowGuard(async () => undefined);
    expect(window.open).toBe(stub);

    await expect(
      withPopupWindowGuard(async () => {
        throw new Error('login failed');
      }),
    ).rejects.toThrow('login failed');
    expect(window.open).toBe(stub);
  });

  // A reference already handed out stays guarded; restoring `window.open` only
  // stops new ones from being wrapped.
  it('keeps guarding a popup opened inside the scope', async () => {
    const opened = await openDuring(discardedWindow());

    // Reading it would throw without the guard still being in place.
    expect(() => opened?.closed).not.toThrow();
    expect(() => opened?.close()).not.toThrow();
  });

  it('survives nested scopes without stranding the wrapper', async () => {
    const stub = jest.fn() as unknown as typeof window.open;
    window.open = stub;

    await withPopupWindowGuard(async () => {
      await withPopupWindowGuard(async () => undefined);
      expect(window.open).not.toBe(stub);
    });

    expect(window.open).toBe(stub);
  });
});
