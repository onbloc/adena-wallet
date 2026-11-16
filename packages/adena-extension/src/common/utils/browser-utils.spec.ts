import { closeCurrentSurface, isFirefox } from './browser-utils';
import type { Mock } from 'vitest';

type TabStub = { id?: number; url?: string };

const mockChromeTabs = (
  getCurrent?: (callback: (tab?: TabStub) => void) => void,
): { remove: Mock; getCurrent?: Mock } => {
  const remove = vi.fn();
  (globalThis as unknown as { chrome: unknown }).chrome = {
    tabs: getCurrent ? { getCurrent, remove } : { remove },
  };
  return { remove, getCurrent: getCurrent as Mock | undefined };
};

describe('closeCurrentSurface', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.close = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as unknown as { chrome?: unknown }).chrome;
  });

  it('calls window.close() first', () => {
    mockChromeTabs();

    closeCurrentSurface();

    expect(window.close).toHaveBeenCalledTimes(1);
  });

  it('removes this page’s own tab when the browser refused window.close()', () => {
    const { remove } = mockChromeTabs((callback) => callback({ id: 7, url: window.location.href }));

    closeCurrentSurface();
    vi.advanceTimersByTime(100);

    expect(remove).toHaveBeenCalledWith(7, expect.any(Function));
  });

  it('keeps the hash out of the tab/page comparison', () => {
    const { remove } = mockChromeTabs((callback) =>
      callback({ id: 9, url: `${window.location.href.replace(/#.*$/, '')}#/web/all-set` }),
    );

    closeCurrentSurface();
    vi.advanceTimersByTime(100);

    expect(remove).toHaveBeenCalledWith(9, expect.any(Function));
  });

  it('never closes a tab that is not this page (panel context borrowing a tab)', () => {
    const { remove } = mockChromeTabs((callback) =>
      callback({ id: 3, url: 'https://gno.land/r/demo/profile' }),
    );

    closeCurrentSurface();
    vi.advanceTimersByTime(100);

    expect(remove).not.toHaveBeenCalled();
  });

  it('does nothing beyond window.close() when the tabs API is unavailable', () => {
    delete (globalThis as unknown as { chrome?: unknown }).chrome;

    expect(() => {
      closeCurrentSurface();
      vi.advanceTimersByTime(100);
    }).not.toThrow();
  });
});

const setUserAgent = (value: string): void => {
  Object.defineProperty(window.navigator, 'userAgent', { value, configurable: true });
};

const mockExtensionUrl = (url: string): void => {
  (globalThis as unknown as { chrome: unknown }).chrome = {
    runtime: { getURL: (path: string) => `${url}${path}` },
  };
};

describe('isFirefox', () => {
  const originalUserAgent = window.navigator.userAgent;

  afterEach(() => {
    delete (globalThis as unknown as { browser?: unknown }).browser;
    delete (globalThis as unknown as { chrome?: unknown }).chrome;
    setUserAgent(originalUserAgent);
  });

  it('reports Firefox from the moz-extension:// origin', () => {
    mockExtensionUrl('moz-extension://3f1c0a2b-0000-4000-8000-abcdef012345/');
    setUserAgent('Mozilla/5.0 (X11; Linux x86_64) Chrome/151.0.0.0 Safari/537.36');

    expect(isFirefox()).toBe(true);
  });

  it('reports Chromium from the chrome-extension:// origin even when `browser` exists', () => {
    // Chromium exposes a `browser` alias too, so its presence says nothing about
    // the engine. Treating it as a Firefox signal disabled Ledger on Chrome.
    (globalThis as unknown as { browser: unknown }).browser = {};
    mockExtensionUrl('chrome-extension://oekbamjlocgajkopocljlpnnhmdjnmfa/');

    expect(isFirefox()).toBe(false);
  });

  it('reports Firefox from the user agent when extension APIs are unavailable', () => {
    setUserAgent('Mozilla/5.0 (X11; Linux x86_64; rv:156.0) Gecko/20100101 Firefox/156.0');

    expect(isFirefox()).toBe(true);
  });

  it('reports Chromium when neither signal is present', () => {
    setUserAgent(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36',
    );

    expect(isFirefox()).toBe(false);
  });
});
