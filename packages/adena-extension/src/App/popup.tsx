import {
  useInitWallet,
} from '@hooks/use-init-wallet';
import useLink from '@hooks/use-link';
import {
  useWallet,
} from '@hooks/use-wallet';
import {
  PopupRouter,
} from '@router/popup/index';
import {
  GlobalPopupStyle,
} from '@styles/global-style';
import React, {
  ReactElement,
} from 'react';
import {
  HashRouter,
} from 'react-router-dom';

import AppProvider from './app-provider';
import useApp from './use-app';

const RunApp = (): ReactElement => {
  useApp();
  useInitWallet();
  const {
    existWallet, isLoadingExistWallet, isLoadingLockedWallet,
  } = useWallet();
  const {
    openRegister,
  } = useLink();

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
