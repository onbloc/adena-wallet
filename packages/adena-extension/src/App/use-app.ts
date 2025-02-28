import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { ADENA_WALLET_EXTENSION_ID } from '@common/constants/storage.constant';
import { useAccountName } from '@hooks/use-account-name';
import { useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useLoadImages } from '@hooks/use-load-images';
import { useNetwork } from '@hooks/use-network';
import useScrollHistory from '@hooks/use-scroll-history';
import { useTokenMetainfo } from '@hooks/use-token-metainfo';

const useApp = (): void => {
  const { wallet } = useWalletContext();
  const { initAccountNames } = useAccountName();
  const { currentAccount } = useCurrentAccount();
  const { currentNetwork, checkNetworkState } = useNetwork();
  const { initTokenMetainfos } = useTokenMetainfo();
  const { clear: clearLoadingImages } = useLoadImages();
  const { pathname, key } = useLocation();
  const { scrollMove } = useScrollHistory();

  useEffect(() => {
    try {
      chrome?.runtime?.connect({ name: ADENA_WALLET_EXTENSION_ID });
    } catch {}
  }, []);

  useEffect(() => {
    checkNetworkState();
  }, [pathname]);

  useEffect(() => {
    scrollMove();
  }, [key]);

  useEffect(() => {
    if (!currentAccount?.id) {
      return;
    }

    if (!currentNetwork?.networkId) {
      return;
    }

    clearLoadingImages();
    initTokenMetainfos();
  }, [currentAccount?.id, currentNetwork.networkId]);

  useEffect(() => {
    initAccountNames(wallet?.accounts ?? []);
  }, [wallet?.accounts]);
};

export default useApp;
