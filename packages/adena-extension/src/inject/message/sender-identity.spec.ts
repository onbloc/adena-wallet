import type { InjectionMessage } from './message';
import { withSenderIdentity } from './sender-identity';

const EXTENSION_ORIGIN = 'chrome-extension://abcdefghijklmnop/';

const request = (protocol: string, hostname: string): InjectionMessage =>
  ({ status: 'request', type: 'GET_ACCOUNT', key: 'k', protocol, hostname }) as InjectionMessage;

const tab = { id: 1 } as chrome.tabs.Tab;

describe('withSenderIdentity', () => {
  it('replaces a web page claim with the sender origin', () => {
    const result = withSenderIdentity(
      request('agent:', 'claude-code.agent'),
      {
        tab,
        url: 'https://evil.example/page',
        origin: 'https://evil.example',
      },
      EXTENSION_ORIGIN,
    );

    expect(result?.protocol).toBe('https:');
    expect(result?.hostname).toBe('evil.example');
  });

  it('falls back to the sender url when the origin is opaque', () => {
    const result = withSenderIdentity(
      request('https:', 'gnoswap.io'),
      {
        tab,
        url: 'file:///Users/me/dapp.html',
        origin: 'null',
      },
      EXTENSION_ORIGIN,
    );

    expect(result?.protocol).toBe('file:');
    expect(result?.hostname).toBe('');
  });

  it('keeps the identity of extension pages', () => {
    const message = request('extension', 'adena-wallet');
    expect(
      withSenderIdentity(message, { tab, url: `${EXTENSION_ORIGIN}popup.html` }, EXTENSION_ORIGIN),
    ).toBe(message);
  });

  it('rejects a web page without a usable sender url', () => {
    expect(withSenderIdentity(request('https:', 'a.io'), { tab }, EXTENSION_ORIGIN)).toBeNull();
  });
});
