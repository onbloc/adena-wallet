import {bridgeScript} from '../../src/browser/bridge';

describe('bridgeScript', () => {
  it('embeds the token as a string literal inside a closure', () => {
    const script = bridgeScript('a"b\\c</script>');
    expect(script).toContain(JSON.stringify('a"b\\c</script>'));
    expect(script.startsWith('(function () {')).toBe(true);
    expect(script).not.toMatch(/window\.\w*token/i);
  });

  it('forwards only same-window requests and delivers replies to its own origin', () => {
    const posted: string[] = [];
    const listeners: Array<(event: any) => void> = [];
    const fakeWindow: any = {
      location: {origin: 'https://gno.land'},
      ReactNativeWebView: {postMessage: (data: string) => posted.push(data)},
      addEventListener: (_type: string, listener: any) =>
        listeners.push(listener),
      postMessage: jest.fn(),
    };
    // eslint-disable-next-line no-new-func
    new Function('window', bridgeScript('t0k3n'))(fakeWindow);

    listeners[0]({
      source: fakeWindow,
      origin: 'https://gno.land',
      data: {status: 'request', key: 'k'},
    });
    listeners[0]({
      source: {},
      origin: 'https://gno.land',
      data: {status: 'request', key: 'iframe'},
    });
    listeners[0]({
      source: fakeWindow,
      origin: 'https://gno.land',
      data: {status: 'success', key: 'k'},
    });

    expect(posted).toHaveLength(1);
    expect(JSON.parse(posted[0])).toMatchObject({
      channel: 'adena',
      token: 't0k3n',
      origin: 'https://gno.land',
    });

    fakeWindow.__adenaNativeDeliver(
      JSON.stringify({key: 'k', status: 'success'}),
    );
    expect(fakeWindow.postMessage).toHaveBeenCalledWith(
      {key: 'k', status: 'success'},
      'https://gno.land',
    );
  });
});
