import { closeCurrentSurface } from './browser-utils';

type TabStub = { id?: number; url?: string };

const mockChromeTabs = (
  getCurrent?: (callback: (tab?: TabStub) => void) => void,
): { remove: jest.Mock; getCurrent?: jest.Mock } => {
  const remove = jest.fn();
  (globalThis as unknown as { chrome: unknown }).chrome = {
    tabs: getCurrent ? { getCurrent, remove } : { remove },
  };
  return { remove, getCurrent: getCurrent as jest.Mock | undefined };
};

describe('closeCurrentSurface', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.close = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    delete (globalThis as unknown as { chrome?: unknown }).chrome;
  });

  it('calls window.close() first', () => {
    mockChromeTabs();

    closeCurrentSurface();

    expect(window.close).toHaveBeenCalledTimes(1);
  });

  it('removes this page’s own tab when the browser refused window.close()', () => {
    const { remove } = mockChromeTabs((callback) =>
      callback({ id: 7, url: window.location.href }),
    );

    closeCurrentSurface();
    jest.advanceTimersByTime(100);

    expect(remove).toHaveBeenCalledWith(7, expect.any(Function));
  });

  it('keeps the hash out of the tab/page comparison', () => {
    const { remove } = mockChromeTabs((callback) =>
      callback({ id: 9, url: `${window.location.href.replace(/#.*$/, '')}#/web/all-set` }),
    );

    closeCurrentSurface();
    jest.advanceTimersByTime(100);

    expect(remove).toHaveBeenCalledWith(9, expect.any(Function));
  });

  it('never closes a tab that is not this page (panel context borrowing a tab)', () => {
    const { remove } = mockChromeTabs((callback) =>
      callback({ id: 3, url: 'https://gno.land/r/demo/profile' }),
    );

    closeCurrentSurface();
    jest.advanceTimersByTime(100);

    expect(remove).not.toHaveBeenCalled();
  });

  it('does nothing beyond window.close() when the tabs API is unavailable', () => {
    delete (globalThis as unknown as { chrome?: unknown }).chrome;

    expect(() => {
      closeCurrentSurface();
      jest.advanceTimersByTime(100);
    }).not.toThrow();
  });
});
