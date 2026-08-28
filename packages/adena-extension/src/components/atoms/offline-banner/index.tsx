import { onlineManager, useQueryClient } from '@tanstack/react-query';
import { ReactElement, useCallback, useEffect, useState } from 'react';

const SPIN_STYLE_ID = 'adena-offline-spin';

/** Injected once: @keyframes cannot be expressed in an inline style attribute. */
const ensureSpinKeyframes = (): void => {
  if (typeof document === 'undefined' || document.getElementById(SPIN_STYLE_ID)) {
    return;
  }
  const el = document.createElement('style');
  el.id = SPIN_STYLE_ID;
  el.textContent =
    '@keyframes adena-offline-spin{to{transform:rotate(360deg)}}' +
    '@media (prefers-reduced-motion: reduce){' +
    '.adena-offline-spinner{animation:none!important;opacity:.6}}';
  document.head.appendChild(el);
};

const Spinner = (): ReactElement => (
  <span
    className='adena-offline-spinner'
    aria-hidden='true'
    style={{
      width: 12,
      height: 12,
      flex: '0 0 auto',
      borderRadius: '50%',
      border: '2px solid rgba(245, 200, 106, 0.3)',
      borderTopColor: '#f5c86a',
      animation: 'adena-offline-spin 0.8s linear infinite',
    }}
  />
);

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
 */

const isBrowserOffline = (): boolean =>
  typeof navigator !== 'undefined' && navigator.onLine === false;

export const OfflineBanner = (): ReactElement | null => {
  const queryClient = useQueryClient();
  const [offline, setOffline] = useState(isBrowserOffline);
  const [overridden, setOverridden] = useState(false);

  useEffect(ensureSpinKeyframes, []);

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
    <div
      role='status'
      style={{
        // STICKY, NOT STATIC, and in its own stacking context. In flow it was
        // drawn under the "You are on <network>" label, which is also in flow
        // and paints later.
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        background: '#3a2f1a',
        borderBottom: '1px solid #6b5426',
        color: '#f5c86a',
        fontSize: 12,
        lineHeight: 1.4,
      }}
    >
      {overridden ? <Spinner /> : null}
      <span style={{ flex: 1 }}>
        {overridden ? (
          <>
            <strong style={{ fontWeight: 600 }}>Retrying anyway.</strong> Your
            browser still reports no connection. Chain requests are being sent
            regardless — if they fail, that signal was right.
          </>
        ) : (
          <>
            <strong style={{ fontWeight: 600 }}>No network connection.</strong>{' '}
            Your accounts and addresses are shown from local storage; balances
            and chain data are paused until you reconnect.
          </>
        )}
      </span>
      <button
        type='button'
        onClick={overridden ? stop : retry}
        style={{
          flex: '0 0 auto',
          padding: '5px 12px',
          borderRadius: 5,
          border: '1px solid #6b5426',
          background: 'transparent',
          color: '#f5c86a',
          cursor: 'pointer',
          fontSize: 12,
        }}
      >
        {overridden ? 'Stop' : 'Retry'}
      </button>
    </div>
  );
};

export default OfflineBanner;
