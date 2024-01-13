import React, { ReactElement } from 'react';
import { WebRouter } from '@router/web/index';

import AppProvider from './app-provider';
import useApp from './use-app';

const RunApp = (): ReactElement => {
  useApp();
  return <WebRouter />;
};

const App = (): ReactElement => {
  return (
    <AppProvider>
      <RunApp />
    </AppProvider>
  );
};

export default App;
