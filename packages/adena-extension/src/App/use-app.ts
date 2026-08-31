import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { useIdleTimer } from 'react-idle-timer';
import { useLocation } from 'react-router-dom';

import { WALLET_LOCKED_QUERY_KEY } from '@common/constants/query-key.constant';
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
  const { wallet, clearWallet, initWallet } = useWalletContext();
  const { initAccountNames } = useAccountName();
  const { currentAccount } = useCurrentAccount();
  const { currentNetwork, checkNetworkState } = useNetwork();
  const { initTokenMetainfos } = useTokenMetainfo();
  const { pathname, key } = useLocation();
  const { scrollMove } = useScrollHistory();
  const { lockedWallet } = useWallet();
  const queryClient = useQueryClient();

  // Auto-lock only clears the background's session storage. Everything the
  // popup holds — the deserialized wallet, the selected account, the cached
  // `wallet/locked` query — survives untouched, so tear it down here the same
  // way the manual Lock action does. `initWallet` then re-reads the (now
  // locked) state, which routes to Login via use-init-wallet and refreshes the
  // cached lock query.
  const handleAutoLock = useCallback(async (): Promise<void> => {
    try {
      await clearWallet();
      await initWallet();
    } finally {
      // Runs even if initWallet threw, so the lock screen still appears.
      await queryClient.invalidateQueries({ queryKey: [WALLET_LOCKED_QUERY_KEY] });
    }
  }, [clearWallet, initWallet, queryClient]);

  // Held in a ref so the chrome listener is registered exactly once: the
  // provider hands back fresh `clearWallet` / `initWallet` identities on every
  // render, which would otherwise re-subscribe on each one.
  const handleAutoLockRef = useRef(handleAutoLock);

  useEffect(() => {
    handleAutoLockRef.current = handleAutoLock;
  }, [handleAutoLock]);

  useEffect(() => {
    const handler = (message: unknown): void => {
      if (isAutoLockTriggeredMessage(message)) {
        handleAutoLockRef.current().catch((error) => console.warn(error));
      }
    };
    chrome.runtime.onMessage.addListener(handler);
    return (): void => {
      chrome.runtime.onMessage.removeListener(handler);
    };
  }, []);

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
