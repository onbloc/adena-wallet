import React, { ReactElement } from 'react';
import { PopupRouter } from '@router/popup/index';

import AppProvider from './app-provider';
import useApp from './use-app';
import { GlobalPopupStyle } from '@styles/global-style';

const RunApp = (): ReactElement => {
  useApp();
  return <PopupRouter />;
};

const App = (): ReactElement => {
  return (
    <AppProvider>
      <GlobalPopupStyle />
      <RunApp />
    </AppProvider>
  );
};

export default App;
