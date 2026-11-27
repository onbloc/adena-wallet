import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useContainer } from '../di/container-provider';
import { SessionStatus, useSessionStore } from '../stores/session.store';
import { useToastStore } from '../stores/toast.store';

// Re-registers the device with the push server whenever the watched accounts or network may have
// changed (unlock, revision bump, foreground, token refresh), and shows foreground pushes as toasts.
export const useNotificationSync = (): void => {
  const { notificationService } = useContainer();
  const status = useSessionStore(state => state.status);
  const revision = useSessionStore(state => state.revision);
  const hasWallet = status === SessionStatus.LOCKED || status === SessionStatus.UNLOCKED;

  useEffect(() => {
    if (!hasWallet) {
      return undefined;
    }

    const sync = (): void => {
      notificationService.sync().catch(() => undefined);
    };

    sync();
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        sync();
      }
    });
    const stopTokenRefresh = notificationService.onTokenRefresh();

    return (): void => {
      appState.remove();
      stopTokenRefresh();
    };
  }, [hasWallet, notificationService, revision]);

  useEffect(() => notificationService.onForegroundMessage((message) => {
    const text = [message.title, message.body].filter(Boolean).join('\n');

    if (text) {
      useToastStore.getState().show(text, 'info');
    }
  }), [notificationService]);
};
