import {
  WebRouter,
} from '@router/web/index';
import {
  GlobalWebStyle,
} from '@styles/global-style';
import React, {
  ReactElement,
} from 'react';
import {
  MemoryRouter,
} from 'react-router-dom';

import AppProvider from './app-provider';
import useApp from './use-app';

const RunApp = (): ReactElement => {
  useApp();
  return <WebRouter />;
};

const App = (): ReactElement => {
  return (
    <AppProvider>
      <GlobalWebStyle />
      <MemoryRouter>
        <RunApp />
      </MemoryRouter>
    </AppProvider>
  );
};

export default App;
