import React, { ReactElement } from 'react';
import { CustomRouter } from '@router/custom-router';

import AppProvider from './app-provider';
import useApp from './use-app';

const RunApp = (): ReactElement => {
  useApp();
  return <CustomRouter />;
};

const App = (): ReactElement => {
  return (
    <AppProvider>
      <RunApp />
    </AppProvider>
  );
};

export default App;
