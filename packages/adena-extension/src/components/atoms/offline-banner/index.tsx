import { onlineManager, useQueryClient } from '@tanstack/react-query';
import React, { ReactElement, useCallback, useEffect, useState } from 'react';

import { Button } from '@components/atoms/button';
import { Spinner } from '@components/atoms/spinner';
import { WarningTriangleIcon } from '@components/atoms/warning-triangle-icon';

import { OfflineBannerWrapper } from './offline-banner.styles';

const SPINNER_SIZE = 14;

/**
 * A TOP-LEVEL BAR FOR THE OFFLINE CASE, because Adena had no offline UI at all.
 *
 * Nothing in this extension read navigator.onLine or react-query's onlineManager,
 * and no screen said "offline" anywhere. react-query's default networkMode is
 * 'online', which PAUSES a query while the browser reports offline: it never
 * runs, never errors, and its status stays 'loading' for ever. Combined with
 * screens that render an empty container while loading, an offline browser saw
 * blank pages with nothing in the console.
 *
 * VISIBILITY FOLLOWS THE BROWSER, NOT react-query's FLAG. The first version of
 * this bar hid itself as soon as Retry was pressed, because Retry calls
 * onlineManager.setOnline(true) and the bar was keyed on onlineManager. So a
 * user still offline pressed Retry and the warning vanished — the interface
 * asserting a connection it had no evidence for, which is precisely the silent
 * lie this component exists to end. The raw browser signal decides whether the
 * bar shows; the override only changes what it SAYS.
 *
 * WHY AN OVERRIDE AT ALL. navigator.onLine is the OS's "is there any route"
 * signal and it is wrong often enough to matter — a wedged Chrome network
 * notifier reports offline on a perfectly connected machine, and then every
 * paused query hangs until the browser is restarted. Retry tells react-query to
 * proceed regardless. A user who can see their connection working should not be
 * blocked by a signal they can observe to be false; but they should also be told,
 * for as long as it lasts, that they are running against the browser's claim.
 *
 * The bar carries no positioning of its own: hosts differ (the popup pins a
 * fixed header and network label above it, the web pages do not), so each one
 * places it. See wallet-main for the popup slot.
 */

const isBrowserOffline = (): boolean =>
  typeof navigator !== 'undefined' && navigator.onLine === false;

export const OfflineBanner = (): ReactElement | null => {
  const queryClient = useQueryClient();
  const [offline, setOffline] = useState(isBrowserOffline);
  const [overridden, setOverridden] = useState(false);

  useEffect(() => {
    const onOnline = (): void => {
      // A REAL recovery: drop the override so the next genuine outage is
      // reported honestly rather than silently suppressed by an old click.
      setOffline(false);
      setOverridden(false);
      onlineManager.setOnline(undefined);
      queryClient.refetchQueries({ type: 'active' });
    };
    const onOffline = (): void => {
      setOffline(true);
      // THE OVERRIDE MUST NOT SURVIVE A NEW OUTAGE. setOnline(true) is sticky
      // for the session, so a Retry pressed during an earlier wedge left the
      // manager claiming online for ever after. The next real disconnection
      // then went undetected: nothing was paused, keepPreviousData kept showing
      // the last figures, and a chain only admitted it was stale when it
      // happened to error on its own. Hand the decision back to the signal.
      onlineManager.setOnline(undefined);
      setOverridden(false);
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return (): void => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [queryClient]);

  const retry = useCallback((): void => {
    // Force react-query to proceed, then refetch. If the browser was telling the
    // truth the requests fail into their own error states; if it was not,
    // everything works again. Either way the bar stays up while the browser
    // still claims to be offline.
    onlineManager.setOnline(true);
    setOverridden(true);
    queryClient.refetchQueries({ type: 'active' });
  }, [queryClient]);

  const stop = useCallback((): void => {
    onlineManager.setOnline(undefined);
    setOverridden(false);
  }, []);

  if (!offline) {
    return null;
  }

  return (
    <OfflineBannerWrapper role='status'>
      <span className='indicator'>
        {overridden ? <Spinner size={SPINNER_SIZE} /> : <WarningTriangleIcon size={SPINNER_SIZE} />}
      </span>
      <span className='message'>
        {overridden ? (
          <>
            <span className='headline'>Retrying anyway.</span> Your browser still reports no
            connection. Chain requests are being sent regardless — if they fail, that signal was
            right.
          </>
        ) : (
          <>
            <span className='headline'>No network connection.</span> Your accounts and addresses are
            shown from local storage; balances and chain data are paused until you reconnect.
          </>
        )}
      </span>
      <Button
        className='action-button'
        hierarchy='ghost'
        height='26px'
        radius='6px'
        onClick={overridden ? stop : retry}
      >
        {overridden ? 'Stop' : 'Retry'}
      </Button>
    </OfflineBannerWrapper>
  );
};

export default OfflineBanner;
