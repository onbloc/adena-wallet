/**
 * Who sent a dApp request. `chrome.runtime.MessageSender` satisfies this shape;
 * the mobile app fills it from the WebView's native navigation state, never
 * from what the page reports about itself.
 */
export interface RequestSender {
  url?: string;
  origin?: string;
  tab?: { id?: number; windowId?: number };
}
