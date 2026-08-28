import React, { ReactElement } from 'react';
import { WebRouter } from '@router/web/index';
import OfflineBanner from '@components/atoms/offline-banner';

import AppProvider from './app-provider';
import useApp from './use-app';
import { GlobalWebStyle } from '@styles/global-style';
import { MemoryRouter } from 'react-router-dom';

const RunApp = (): ReactElement => {
  useApp();
  return (
    <>
      <OfflineBanner />
      <WebRouter />
    </>
  );
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
