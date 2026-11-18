import type { InjectionMessage } from '@inject/message/message';

import { AgentHostRequestError } from './agent-host-protocol';
import { existsAdenaPopups, MAX_POPUP_DATA_LENGTH, requirePopupFits } from './agent-popup';

const POPUP = 'chrome-extension://adena/popup.html';

const installWindows = (windows: chrome.windows.Window[]): void => {
  (globalThis as unknown as { chrome: unknown }).chrome = {
    runtime: { getURL: (path: string) => `chrome-extension://adena/${path}` },
    windows: { getAll: vi.fn().mockResolvedValue(windows) },
  };
};

const popupWindow = (url: string): chrome.windows.Window =>
  ({ type: 'popup', tabs: [{ url }] }) as unknown as chrome.windows.Window;

const message = (body: string): InjectionMessage =>
  ({ key: 'k', type: 'DO_CONTRACT', data: { body } }) as unknown as InjectionMessage;

describe('existsAdenaPopups', () => {
  it('ignores popups that are not Adena windows', async () => {
    installWindows([
      popupWindow('https://dapp.example/login'),
      popupWindow('chrome-extension://other/popup.html'),
      { type: 'normal', tabs: [{ url: `${POPUP}#/` }] } as unknown as chrome.windows.Window,
    ]);
    await expect(existsAdenaPopups()).resolves.toBe(false);
  });

  it('finds an open Adena approval popup', async () => {
    installWindows([popupWindow(`${POPUP}#/approve/wallet/transaction?key=1`)]);
    await expect(existsAdenaPopups()).resolves.toBe(true);
  });
});

describe('requirePopupFits', () => {
  it('accepts an ordinary request', () => {
    expect(() => requirePopupFits(message('small'))).not.toThrow();
  });

  it('rejects a request whose popup URL would exceed the browser limit', () => {
    try {
      requirePopupFits(message('x'.repeat(MAX_POPUP_DATA_LENGTH)));
    }
    catch (error) {
      expect(error).toBeInstanceOf(AgentHostRequestError);
      expect((error as AgentHostRequestError).code).toBe('request_too_large');
      return;
    }
    throw new Error('expected request_too_large');
  });
});
