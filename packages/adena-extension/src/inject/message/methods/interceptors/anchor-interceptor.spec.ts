import { AnchorInterceptor } from './anchor-interceptor';
import { GnoMessageInfo } from '../gno-connect';
import * as gnoConnect from '../gno-connect';
import { GnoConnectInfoProvider } from '../gno-connect-info-provider';
import { InterceptorContext } from '../gno-interceptor.types';

// The real command handler pulls @adena-wallet/sdk, whose web3auth → nested
// @noble/hashes dependency ships sources jest does not transpile ("Uint8Array
// expected"). These tests always inject their own handler, so the default one is
// never exercised; mocking the module keeps the suite loadable.
jest.mock('@inject/message/command-handler', () => ({
  CommandHandler: { createContentHandler: jest.fn() },
}));

const TX_LINK = 'https://example.com/r/demo/profile$help&func=SetStringField&field=Avatar';

const setGnoConnectMetas = (): void => {
  document.head.innerHTML = `
    <meta name="gnoconnect:rpc" content="https://rpc.gno.land" />
    <meta name="gnoconnect:chainid" content="gnoland-1" />
  `;
  GnoConnectInfoProvider.reset();
};

const clickTxLink = (href: string = TX_LINK): boolean => {
  const anchor = document.createElement('a');
  anchor.setAttribute('href', href);
  document.body.appendChild(anchor);

  return anchor.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
};

describe('AnchorInterceptor', () => {
  let handler: jest.Mock<void, [GnoMessageInfo, InterceptorContext]>;

  beforeEach(() => {
    handler = jest.fn();
    document.body.innerHTML = '';
    setGnoConnectMetas();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not swallow a $help link click when the origin is not a supported Gno origin', () => {
    // jsdom serves from http://localhost, which no chain in chains.json declares.
    const interceptor = new AnchorInterceptor(handler);
    interceptor.register();
    const consoleInfo = jest.spyOn(console, 'info').mockImplementation(() => undefined);

    const notPrevented = clickTxLink();

    // The page keeps its own navigation: a click that Adena will not act on must
    // not be turned into a dead click.
    expect(notPrevented).toBe(true);
    expect(handler).not.toHaveBeenCalled();
    expect(consoleInfo).toHaveBeenCalledWith(expect.stringContaining('not a supported Gno origin'));
  });

  it('intercepts the click and hands the parsed message to the handler for a supported origin', () => {
    jest.spyOn(gnoConnect, 'canHandleGnoConnectOrigin').mockReturnValue(true);
    const interceptor = new AnchorInterceptor(handler);
    interceptor.register();

    const notPrevented = clickTxLink();

    expect(notPrevented).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        packagePath: 'gno.land/r/demo/profile',
        functionName: 'SetStringField',
        args: [{ index: 0, key: 'field', value: 'Avatar' }],
      }),
      { gnoConnectInfo: { rpc: 'https://rpc.gno.land', chainId: 'gnoland-1' } },
    );
  });

  it('ignores clicks on ordinary links', () => {
    jest.spyOn(gnoConnect, 'canHandleGnoConnectOrigin').mockReturnValue(true);
    const interceptor = new AnchorInterceptor(handler);
    interceptor.register();

    const notPrevented = clickTxLink('https://example.com/r/demo/profile');

    expect(notPrevented).toBe(true);
    expect(handler).not.toHaveBeenCalled();
  });

  it('never intercepts when gno connect metadata is absent', () => {
    document.head.innerHTML = '';
    GnoConnectInfoProvider.reset();
    const interceptor = new AnchorInterceptor(handler);

    interceptor.register();

    expect(interceptor.isActive()).toBe(false);
    expect(clickTxLink()).toBe(true);
    expect(handler).not.toHaveBeenCalled();
  });
});
