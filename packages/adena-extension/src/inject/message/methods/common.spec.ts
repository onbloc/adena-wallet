import { isPopupResponseSender } from './common';

const ORIGIN = 'chrome-extension://adena/';
const POPUP_WINDOW = 7;

const sender = (url: string | undefined, windowId?: number): chrome.runtime.MessageSender =>
  ({ url, tab: windowId === undefined ? undefined : ({ windowId } as chrome.tabs.Tab) }) as chrome.runtime.MessageSender;

describe('isPopupResponseSender', () => {
  it('accepts Adena pages for dApp approvals', () => {
    expect(isPopupResponseSender(sender(`${ORIGIN}popup.html#/x`, 3), ORIGIN, POPUP_WINDOW, false))
      .toBe(true);
  });

  it('refuses content scripts and pages', () => {
    for (const url of ['https://evil.example/', 'chrome-extension://other/popup.html', undefined]) {
      expect(isPopupResponseSender(sender(url, POPUP_WINDOW), ORIGIN, POPUP_WINDOW, false)).toBe(
        false,
      );
    }
    expect(isPopupResponseSender(undefined, ORIGIN, POPUP_WINDOW, false)).toBe(false);
  });

  it('requires the approval window itself for agent approvals', () => {
    const url = `${ORIGIN}popup.html#/approve`;
    expect(isPopupResponseSender(sender(url, POPUP_WINDOW), ORIGIN, POPUP_WINDOW, true)).toBe(true);
    expect(isPopupResponseSender(sender(url, 8), ORIGIN, POPUP_WINDOW, true)).toBe(false);
    expect(isPopupResponseSender(sender(url), ORIGIN, POPUP_WINDOW, true)).toBe(false);
    expect(isPopupResponseSender(sender(url, POPUP_WINDOW), ORIGIN, undefined, true)).toBe(false);
  });
});
