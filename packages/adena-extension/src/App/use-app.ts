import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { useCurrentAccount } from '@hooks/use-current-account';
import { useNetwork } from '@hooks/use-network';
import { useTokenMetainfo } from '@hooks/use-token-metainfo';
import { useWalletContext } from '@hooks/use-context';
import { useAccountName } from '@hooks/use-account-name';
import useScrollHistory from '@hooks/use-scroll-history';

const useApp = (): void => {
  const { wallet } = useWalletContext();
  const { initAccountNames } = useAccountName();
  const { currentAccount } = useCurrentAccount();
  const { currentNetwork, checkNetworkState } = useNetwork();
  const { initTokenMetainfos } = useTokenMetainfo();
  const { pathname, key } = useLocation();
  const { scrollMove } = useScrollHistory();

  useEffect(() => {
    checkNetworkState();
  }, [pathname]);

  useEffect(() => {
    scrollMove();
  }, [key]);

  useEffect(() => {
    if (currentAccount && currentNetwork) {
      initTokenMetainfos();
    }
  }, [currentAccount, currentNetwork]);

  useEffect(() => {
    initAccountNames(wallet?.accounts ?? []);
  }, [wallet?.accounts]);
};

export default useApp;
