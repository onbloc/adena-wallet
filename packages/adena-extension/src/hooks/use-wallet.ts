import {
  makeWalletExistsQueryKey,
  makeWalletLockedQueryKey,
} from '@common/constants/query-key.constant';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useAdenaContext, useWalletContext } from './use-context';

export interface UseWalletReturn {
  hasHDWallet: boolean;
  existWallet: boolean | undefined;
  isLoadingExistWallet: boolean;

  lockedWallet: boolean | undefined;
  isLoadingLockedWallet: boolean;
}

export const useWallet = (): UseWalletReturn => {
  const { walletService } = useAdenaContext();
  const { wallet } = useWalletContext();

  const hasHDWallet = useMemo(() => {
    if (!wallet) {
      return false;
    }
    return wallet.hasHDWallet();
  }, [wallet]);

  // networkMode 'always': both read chrome.storage, never the network. Paused
  // offline they leave the popup blank, since App/popup renders <></> while
  // isLoadingLockedWallet is true.
  const { data: existWallet, isPending: isLoadingExistWallet } = useQuery({
    queryKey: makeWalletExistsQueryKey(walletService.id),

    queryFn: async () => {
      const existWallet = await walletService.existsWallet().catch(() => false);
      return existWallet;
    },
    networkMode: 'always',
  });

  const { data: lockedWallet, isPending: isLoadingLockedWallet } = useQuery({
    queryKey: makeWalletLockedQueryKey(walletService.id),

    queryFn: async () => {
      const lockedWallet = await walletService.isLocked();
      return lockedWallet;
    },
    networkMode: 'always',
  });

  return {
    hasHDWallet,
    existWallet,
    isLoadingExistWallet,
    lockedWallet,
    isLoadingLockedWallet,
  };
};
