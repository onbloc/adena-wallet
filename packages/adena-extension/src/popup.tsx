import * as ReactDOM from 'react-dom/client';

import App from './App/popup';

const mountNode = document.getElementById('popup');
if (mountNode) {
  // The boot spinner in popup.html covers the window until the bundle is ready.
  // React renders its own loading view from here on, so drop the static one.
  document.getElementById('boot')?.remove();

  const root = ReactDOM.createRoot(mountNode);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  root.render((<App />) as any);
}
