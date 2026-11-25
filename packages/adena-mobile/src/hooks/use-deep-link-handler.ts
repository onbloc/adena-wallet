import { useEffect } from 'react';
import { Linking } from 'react-native';

import { toErrorMessage } from '../core/error-message';
import { isDappRequestUrl } from '../deeplink/dapp-protocol';
import { useContainer } from '../di/container-provider';
import { navigationRef } from '../navigation/navigation-ref';
import { useDappRequestStore } from '../stores/dapp-request.store';
import { SessionStatus, useSessionStore } from '../stores/session.store';
import { useToastStore } from '../stores/toast.store';

// Queues incoming dApp links and presents them one at a time once the wallet is unlocked.
export const useDeepLinkHandler = (navigationReady: boolean): void => {
  const { dappService } = useContainer();
  const status = useSessionStore(state => state.status);
  const queue = useDappRequestStore(state => state.queue);
  const active = useDappRequestStore(state => state.active);
  const inFlight = useDappRequestStore(state => state.inFlight);
  const showToast = useToastStore(state => state.show);

  useEffect(() => {
    const capture = (url?: string | null): void => {
      if (url && isDappRequestUrl(url) && !useDappRequestStore.getState().enqueue(url)) {
        showToast('Too many pending requests. Try again later.', 'error');
      }
    };

    Linking.getInitialURL().then(capture);
    const subscription = Linking.addEventListener('url', ({ url }) => capture(url));

    return (): void => subscription.remove();
  }, [showToast]);

  // An unanswered request goes back to the queue when the wallet locks and is shown again after unlock.
  // An in-flight request is left alone: it is answered by its own screen even after locking.
  useEffect(() => {
    if (status !== SessionStatus.UNLOCKED && !inFlight) {
      useDappRequestStore.getState().requeueActive();
    }
  }, [inFlight, status]);

  useEffect(() => {
    if (active || queue.length === 0 || status !== SessionStatus.UNLOCKED || !navigationReady || !navigationRef.isReady()) {
      return;
    }

    const { dequeue, setActive } = useDappRequestStore.getState();
    const url = dequeue();

    if (!url) {
      return;
    }

    try {
      const request = dappService.parseRequestUrl(url);

      // Reopening an answered link gets an error response instead of a second prompt.
      if (dappService.isProcessed(request)) {
        showToast('This request was already handled.', 'error');
        Linking.openURL(dappService.answerDuplicate(request)).catch(() => undefined);
        return;
      }

      setActive({ url, request });
      navigationRef.navigate('DappRequest');
    }
    catch (error) {
      // Without a valid callback there is nobody to answer, so the user is informed locally.
      showToast(toErrorMessage(error, 'Invalid request link'), 'error');
    }
  }, [active, dappService, navigationReady, queue, showToast, status]);
};
