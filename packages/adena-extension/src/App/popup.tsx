import { PopupRouter } from '@router/popup/index';
import { ReactElement, useEffect, useRef } from 'react';

import { isFirefox, isToolbarPanel } from '@common/utils/browser-utils';
import { Spinner } from '@components/atoms';
import { useInitWallet } from '@hooks/use-init-wallet';
import useLink from '@hooks/use-link';
import { useWallet } from '@hooks/use-wallet';
import { GlobalPopupStyle } from '@styles/global-style';
import { HashRouter } from 'react-router-dom';
import styled from 'styled-components';
import AppProvider from './app-provider';
import useApp from './use-app';

// Both gate queries read the wallet state through the background service worker,
// so on a cold start the popup has nothing to show for as long as the worker
// takes to boot. Rendering the spinner instead of an empty fragment keeps the
// window from looking like it failed to open.
const StyledBootLoading = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
`;

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
    return (
      <StyledBootLoading>
        <Spinner size={48} />
      </StyledBootLoading>
    );
  }

  return <PopupRouter />;
};

const App = (): ReactElement => {
  // Firefox sizes the toolbar panel from the document, so a percentage layout
  // lets every route resize it. Popup windows and Chrome are unaffected.
  const pinPanelSize = isFirefox() && isToolbarPanel();

  return (
    <AppProvider>
      <GlobalPopupStyle $pinPanelSize={pinPanelSize} />
      <HashRouter>
        <RunApp />
      </HashRouter>
    </AppProvider>
  );
};

export default App;
