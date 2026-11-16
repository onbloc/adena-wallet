// Must stay the first import: later modules may build BigNumbers on load.
import '@common/config/bignumber';
import * as ReactDOM from 'react-dom/client';

import App from './App/web';

const mountNode = document.getElementById('web');
if (mountNode) {
  const root = ReactDOM.createRoot(mountNode);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  root.render((<App />) as any);
}
