import { FormSubmitInterceptor } from './form-submit-interceptor';
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

const setGnoConnectMetas = (): void => {
  document.head.innerHTML = `
    <meta name="gnoconnect:rpc" content="https://rpc.gno.land" />
    <meta name="gnoconnect:chainid" content="gnoland-1" />
  `;
  GnoConnectInfoProvider.reset();
};

const buildActionFunctionForm = (): HTMLFormElement => {
  document.body.innerHTML = `
    <article
      class="b-action-function"
      data-action-function-name-value="SetStringField"
      data-action-function-pkgpath-value="gno.land/r/demo/profile"
    >
      <form class="params">
        <input data-action-function-param-value="field" value="Avatar" />
        <input data-action-function-param-value="value" value="me" />
      </form>
    </article>
  `;

  return document.querySelector('form.params') as HTMLFormElement;
};

const submitForm = (form: HTMLFormElement): boolean =>
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

describe('FormSubmitInterceptor', () => {
  let handler: jest.Mock<void, [GnoMessageInfo, InterceptorContext]>;

  beforeEach(() => {
    handler = jest.fn();
    setGnoConnectMetas();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('lets a gnoweb action form submit normally when the origin is not a supported Gno origin', () => {
    // jsdom serves from http://localhost, which no chain in chains.json declares.
    const interceptor = new FormSubmitInterceptor(handler);
    interceptor.register();
    const consoleInfo = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    const form = buildActionFunctionForm();

    const notPrevented = submitForm(form);

    expect(notPrevented).toBe(true);
    expect(handler).not.toHaveBeenCalled();
    expect(consoleInfo).toHaveBeenCalledWith(
      expect.stringContaining('not a supported Gno origin'),
    );
  });

  it('takes over the submission for a supported origin', () => {
    jest.spyOn(gnoConnect, 'canHandleGnoConnectOrigin').mockReturnValue(true);
    const interceptor = new FormSubmitInterceptor(handler);
    interceptor.register();
    const form = buildActionFunctionForm();

    const notPrevented = submitForm(form);

    expect(notPrevented).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        packagePath: 'gno.land/r/demo/profile',
        functionName: 'SetStringField',
      }),
      { gnoConnectInfo: { rpc: 'https://rpc.gno.land', chainId: 'gnoland-1' } },
    );
  });

  it('ignores forms that are not gnoweb action function forms', () => {
    jest.spyOn(gnoConnect, 'canHandleGnoConnectOrigin').mockReturnValue(true);
    const interceptor = new FormSubmitInterceptor(handler);
    interceptor.register();
    document.body.innerHTML = '<form class="params"><input value="search" /></form>';

    const notPrevented = submitForm(document.querySelector('form.params') as HTMLFormElement);

    expect(notPrevented).toBe(true);
    expect(handler).not.toHaveBeenCalled();
  });
});
