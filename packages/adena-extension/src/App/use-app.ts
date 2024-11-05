import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { useAccountName } from '@hooks/use-account-name';
import { useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useNetwork } from '@hooks/use-network';
import useScrollHistory from '@hooks/use-scroll-history';
import { useTokenMetainfo } from '@hooks/use-token-metainfo';

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
      initTokenMetainfos(true);
    }
  }, [currentAccount, currentNetwork]);

  useEffect(() => {
    initAccountNames(wallet?.accounts ?? []);
  }, [wallet?.accounts]);
};

export default useApp;
