import * as ReactDOM from 'react-dom/client';

import App from './App/popup';

const mountNode = document.getElementById('popup');
if (mountNode) {
  const root = ReactDOM.createRoot(mountNode);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  root.render((<App />) as any);
}
