import { Button } from '@components/atoms/button';
import { Spinner } from '@components/atoms/spinner';
import { WarningTriangleIcon } from '@components/atoms/warning-triangle-icon';
import { onlineManager, useQueryClient } from '@tanstack/react-query';
import React, { ReactElement, useCallback, useEffect, useState } from 'react';

import { OfflineBannerWrapper } from './offline-banner.styles';

const SPINNER_SIZE = 14;

const isBrowserOffline = (): boolean =>
  typeof navigator !== 'undefined' && navigator.onLine === false;

// Drops a Retry override: the manager goes back to what the browser reports.
const followBrowser = (): void => onlineManager.setOnline(!isBrowserOffline());

/**
 * Offline notice. Carries no positioning; each host places it.
 *
 * Visibility is keyed on the raw browser signal, not on onlineManager: Retry
 * sets the manager online, so keying on it would hide the warning while still
 * offline. Retry only changes what the bar says.
 */
export const OfflineBanner = (): ReactElement | null => {
  const queryClient = useQueryClient();
  const [offline, setOffline] = useState(isBrowserOffline);
  const [overridden, setOverridden] = useState(false);

  useEffect(() => {
    const onOnline = (): void => {
      setOffline(false);
      setOverridden(false);
      followBrowser();
      queryClient.refetchQueries({ type: 'active' });
    };
    const onOffline = (): void => {
      setOffline(true);
      // An earlier Retry set the manager online; follow the browser again so
      // this outage is reported.
      followBrowser();
      setOverridden(false);
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return (): void => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [queryClient]);

  // navigator.onLine reports offline on a connected machine often enough to
  // matter, and every paused query then hangs. Proceed regardless.
  const retry = useCallback((): void => {
    onlineManager.setOnline(true);
    setOverridden(true);
    queryClient.refetchQueries({ type: 'active' });
  }, [queryClient]);

  const stop = useCallback((): void => {
    followBrowser();
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
      {/* Kept to one line: every wrapped line costs 21px of a 540px popup. */}
      <span className='message'>
        {overridden
          ? (
              <>
                <span className='headline'>Retrying anyway.</span>
                {' '}
                Your browser still reports no
                connection.
              </>
            )
          : (
              <>
                <span className='headline'>No network connection.</span>
                {' '}
                Balances and chain data are
                paused until you reconnect.
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
