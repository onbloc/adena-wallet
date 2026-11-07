/**
 * Page-side bridge, injected into the top frame only, before the provider.
 * It replaces the extension's content script: requests that the provider
 * posts to its own window are forwarded to the app, and replies come back
 * through `window.__adenaNativeDeliver`.
 *
 * The token lives only in this closure. Message events from the WebView do
 * not say which frame sent them; a cross-origin iframe cannot read the token,
 * so its messages are dropped by the app.
 */
export function bridgeScript(token: string): string {
  return `(function () {
  var rnw = window.ReactNativeWebView;
  if (!rnw || window.__adenaNativeDeliver) { return; }
  var post = rnw.postMessage.bind(rnw);
  var token = ${JSON.stringify(token)};
  var origin = window.location.origin;
  window.addEventListener('message', function (event) {
    if (event.source !== window || event.origin !== origin) { return; }
    var data = event.data;
    if (!data || data.status !== 'request') { return; }
    try {
      post(JSON.stringify({channel: 'adena', token: token, origin: origin, message: data}));
    } catch (e) {}
  }, false);
  Object.defineProperty(window, '__adenaNativeDeliver', {
    value: function (json) { window.postMessage(JSON.parse(json), origin); },
    writable: false,
    configurable: false
  });
})();
true;`;
}
