import { useCallback, useEffect, useRef } from 'react';

import type { IsCurrentRequest } from './use-social-login-account';

export type UseSocialLoginAttemptReturn = {
  /**
   * Takes ownership of the popup for a new attempt, abandoning any earlier
   * one, and returns the check that tells whether this attempt still owns it.
   */
  begin: () => IsCurrentRequest;
  /** Abandons whatever attempt is in flight without starting another. */
  abandon: () => void;
};

/**
 * Ownership of the social-login popup.
 *
 * A popup outlives the screen that opened it: `GnoSocialWalletProvider`
 * resolves whenever the user finishes with it, and the work that follows adds
 * an account and navigates. Every attempt therefore carries an id, and only
 * the attempt that still holds the latest one may commit.
 *
 * Leaving the screen has to abandon the attempt, and pressing Back in the
 * screen is not the only way to leave: `WebRouter` answers the browser's own
 * Back button by navigating Home, which never reaches a screen's `backStep`
 * and simply unmounts this hook. An attempt left current across that unmount
 * would still add an account — and navigate away from the Home the user had
 * just returned to — when the popup finally resolved. Unmounting abandons it.
 */
const useSocialLoginAttempt = (): UseSocialLoginAttemptReturn => {
  const requestIdRef = useRef(0);

  const begin = useCallback((): IsCurrentRequest => {
    const requestId = (requestIdRef.current += 1);
    return () => requestIdRef.current === requestId;
  }, []);

  const abandon = useCallback(() => {
    requestIdRef.current += 1;
  }, []);

  useEffect(() => {
    return () => {
      abandon();
    };
  }, [abandon]);

  return { begin, abandon };
};

export default useSocialLoginAttempt;
