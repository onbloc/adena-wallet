import { PopupRouter } from '@router/popup/index';
import { ReactElement, useEffect, useRef } from 'react';

import { useInitWallet } from '@hooks/use-init-wallet';
import useLink from '@hooks/use-link';
import { useWallet } from '@hooks/use-wallet';
import { GlobalPopupStyle } from '@styles/global-style';
import { HashRouter } from 'react-router-dom';
import AppProvider from './app-provider';
import useApp from './use-app';

const RunApp = (): ReactElement => {
  useApp();
  useInitWallet();
  const { existWallet, isLoadingExistWallet, isLoadingLockedWallet } = useWallet();
  const { openRegister } = useLink();

  // Guards the register-tab side effect so it runs exactly once.
  const hasOpenedRegisterRef = useRef(false);
  const shouldOpenRegister = isLoadingExistWallet === false && existWallet === false;

  useEffect(() => {
    if (shouldOpenRegister && !hasOpenedRegisterRef.current) {
      hasOpenedRegisterRef.current = true;
      openRegister();
      window.close();
    }
  }, [shouldOpenRegister, openRegister]);

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
