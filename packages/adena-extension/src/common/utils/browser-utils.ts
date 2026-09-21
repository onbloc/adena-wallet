import { POPUP_SESSION_DATA_KEY } from '@common/constants/storage.constant';
import { POPUP_HEIGHT, POPUP_WIDTH } from '@common/constants/ui.constant';
import { ChromeSessionStorage } from '@common/storage/chrome-session-storage';

export const createPopupWindow = async (popupPath: string, state: object = {}): Promise<void> => {
  const popupOption: chrome.windows.CreateData = {
    url: chrome.runtime.getURL(`popup.html#${popupPath}`),
    type: 'popup',
    width: POPUP_WIDTH,
    height: POPUP_HEIGHT,
  };
  new ChromeSessionStorage().set(POPUP_SESSION_DATA_KEY, JSON.stringify(state)).then(() => {
    chrome.windows.create(popupOption, async (windowResponse) => {
      window?.close();
      chrome.tabs.onUpdated.addListener(() => {
        if (!windowResponse) {
          return;
        }
      });
    });
  });
};

export const isExtensionPopup = (): boolean => {
  const views = chrome.extension.getViews({ type: 'popup' });
  return views.length > 0 && views[0] === window;
};

export const isSeparatePopupWindow = (): boolean => {
  if (isExtensionPopup()) {
    return false;
  }

  return window.opener || chrome.extension.getViews({ type: 'popup' }).length === 0;
};

/**
 * Whether this build is running inside Firefox.
 *
 * Firefox is the only browser Adena targets that exposes the promise-based
 * `browser` namespace (`chrome` is kept as an alias for compatibility);
 * Chromium exposes `chrome` only. The user-agent check is the fallback for
 * surfaces without extension APIs and for tests, which set it directly.
 */
export const isFirefox = (): boolean => {
  if (typeof (globalThis as { browser?: unknown }).browser !== 'undefined') {
    return true;
  }

  return typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);
};

/**
 * Closes the browser surface hosting this extension page.
 *
 * `window.close()` only covers surfaces a script opened: popup windows created
 * with `chrome.windows.create({ type: 'popup' })` and the toolbar popup panel.
 * Firefox refuses it for tabs even when the extension created the tab itself —
 * it logs "Scripts may only close windows that were opened by a script." and
 * the tab stays open; Chrome does allow closing a tab that has no session
 * history. So the onboarding web pages (register.html / security.html tabs),
 * whose buttons are meant to dismiss the tab, were dead on Firefox. Fall back
 * to removing this page's own tab through the tabs API. When `window.close()`
 * did succeed the document (and this timer) is discarded before it runs.
 */
export const closeCurrentSurface = (): void => {
  window.close();

  window.setTimeout((): void => {
    const tabs = typeof chrome !== 'undefined' ? chrome.tabs : undefined;
    if (!tabs?.getCurrent) {
      return;
    }

    tabs.getCurrent((tab) => {
      // Only ever close this very page: a panel/window context can report a
      // borrowed tab, and the user's own tab must never be closed.
      if (!tab || tab.id === undefined || typeof tab.url !== 'string') {
        return;
      }
      if (tab.url.split('#')[0] !== window.location.href.split('#')[0]) {
        return;
      }

      tabs.remove(tab.id, () => undefined);
    });
  }, 100);
};
