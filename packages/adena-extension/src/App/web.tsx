import React, { ReactElement } from 'react';
import { WebRouter } from '@router/web/index';

import AppProvider from './app-provider';
import useApp from './use-app';
import { GlobalWebStyle } from '@styles/global-style';

const RunApp = (): ReactElement => {
  useApp();
  return <WebRouter />;
};

const App = (): ReactElement => {
  return (
    <AppProvider>
      <GlobalWebStyle />
      <RunApp />
    </AppProvider>
  );
};

export default App;
