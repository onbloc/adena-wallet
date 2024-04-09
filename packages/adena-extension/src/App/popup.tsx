import React, { ReactElement } from 'react';
import { PopupRouter } from '@router/popup/index';

import AppProvider from './app-provider';
import useApp from './use-app';
import { GlobalPopupStyle } from '@styles/global-style';
import { HashRouter } from 'react-router-dom';
import { useInitWallet } from '@hooks/use-init-wallet';
import { useWallet } from '@hooks/use-wallet';
import useLink from '@hooks/use-link';

const RunApp = (): ReactElement => {
  useApp();
  useInitWallet();
  const { existWallet, isLoadingExistWallet, isLoadingLockedWallet } = useWallet();
  const { openRegister } = useLink();

  if (isLoadingExistWallet === false && existWallet === false) {
    openRegister();
    window.close();
  }

  if (isLoadingLockedWallet || !existWallet) {
    return <></>;
  }

  return <PopupRouter />;
};

const App = (): ReactElement => {
  return (
    <AppProvider>
      <GlobalPopupStyle />
      <HashRouter>
        <RunApp />
      </HashRouter>
    </AppProvider>
  );
};

export default App;
