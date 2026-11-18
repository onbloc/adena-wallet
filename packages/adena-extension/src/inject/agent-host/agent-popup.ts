import { encodeParameter } from '@common/utils/client-utils';
import type { InjectionMessage } from '@inject/message/message';

import { AgentHostRequestError } from './agent-host-protocol';

// The approval popup carries its request in its URL, and Chrome refuses URLs
// over 2 MB; the margin covers the route and other parameters.
export const MAX_POPUP_DATA_LENGTH = 2_000_000 - 4_096;

// Rejects a request whose popup URL would not open, with a clear error.
export const requirePopupFits = (message: InjectionMessage): void => {
  const encodedLength = encodeParameter(message).length;
  if (encodedLength === 0 || encodedLength > MAX_POPUP_DATA_LENGTH) {
    throw new AgentHostRequestError(
      'request_too_large',
      `the request is too large for Adena's approval window (${encodedLength} bytes encoded); ` +
        'send less at once, for example fewer or smaller package files',
    );
  }
};

// Only Adena's own popup windows count: a web page's window.open popup or
// another extension's window must not hold agent approvals back.
export const existsAdenaPopups = async (): Promise<boolean> => {
  const popupPage = chrome.runtime.getURL('popup.html');
  const windows = await chrome.windows.getAll({ populate: true });
  return windows.some(
    (window) =>
      window.type === 'popup' &&
      !!window.tabs?.some((tab) => (tab.url ?? tab.pendingUrl ?? '').startsWith(popupPage)),
  );
};
