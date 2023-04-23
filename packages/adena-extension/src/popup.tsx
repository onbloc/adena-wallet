import * as React from 'react';
import * as ReactDOM from 'react-dom/client';

import App from './app';

const mountNode = document.getElementById('popup');
if (mountNode) {
  const root = ReactDOM.createRoot(mountNode);
  root.render(<App />);
}