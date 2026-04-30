import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { useIdleTimer } from 'react-idle-timer';
import { useLocation } from 'react-router-dom';

import { isAutoLockTriggeredMessage } from '@common/utils/auto-lock-timer';
import { CommandMessage } from '@inject/message/command-message';
import { useAccountName } from '@hooks/use-account-name';
import { useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useNetwork } from '@hooks/use-network';
import useScrollHistory from '@hooks/use-scroll-history';
import { useTokenMetainfo } from '@hooks/use-token-metainfo';
import { useWallet } from '@hooks/use-wallet';

const useApp = (): void => {
  const { wallet } = useWalletContext();
  const { initAccountNames } = useAccountName();
  const { currentAccount } = useCurrentAccount();
  const { currentNetwork, checkNetworkState } = useNetwork();
  const { initTokenMetainfos } = useTokenMetainfo();
  const { pathname, key } = useLocation();
  const { scrollMove } = useScrollHistory();
  const { lockedWallet } = useWallet();
  const queryClient = useQueryClient();

  // Listen for the AUTO_LOCK_TRIGGERED broadcast from background. Without
  // this, the popup keeps rendering the unlocked screen until the next user
  // interaction nudges react-query to refetch — invalidating the cached
  // `wallet/locked` query forces an immediate re-evaluation, which the
  // existing routing logic in use-init-wallet picks up.
  useEffect(() => {
    const handler = (message: unknown): void => {
      if (isAutoLockTriggeredMessage(message)) {
        queryClient.invalidateQueries({ queryKey: ['wallet/locked'] });
      }
    };
    chrome.runtime.onMessage.addListener(handler);
    return (): void => {
      chrome.runtime.onMessage.removeListener(handler);
    };
  }, [queryClient]);

  const sendActivityPing = useCallback(() => {
    chrome.runtime
      .sendMessage(CommandMessage.command('resetAutoLockTimer'))
      .catch(() => undefined);
  }, []);

  // Send an activity ping whenever a real user input is detected. The throttle
  // collapses bursts (mouse moves, keystrokes) into one message every 5s so we
  // don't flood the background with sendMessage calls.
  useIdleTimer({
    throttle: 5000,
    onAction: sendActivityPing,
    disabled: lockedWallet !== false,
  });

  // Mounting any UI surface (popup, separate window, web page) counts as
  // activity, so reset the timer on first render too — otherwise a user who
  // opens the popup without moving the mouse would see no reset event.
  useEffect(() => {
    if (lockedWallet === false) {
      sendActivityPing();
    }
  }, [lockedWallet, sendActivityPing]);

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

    initTokenMetainfos();
  }, [currentAccount?.id, currentNetwork.networkId]);

  useEffect(() => {
    initAccountNames(wallet?.accounts ?? []);
  }, [wallet?.accounts]);
};

export default useApp;
