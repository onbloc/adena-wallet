import * as ReactDOM from 'react-dom/client';

import App from './App/web';

const mountNode = document.getElementById('web');
if (mountNode) {
  const root = ReactDOM.createRoot(mountNode);
  root.render(<App />);
}
