import { useMemo } from 'react';
import { isSessionAccount } from 'adena-module';

import { useCurrentAccount } from '@hooks/use-current-account';
import { useSessions } from '@hooks/use-sessions';

// True when the currently selected account is a SessionAccount that the
// local SessionRepository has flagged REVOKED. Used to swap UI affordances
// (header popover content, main action button disable) so the user is
// guided to remove the now-unsignable session account.
export const useIsCurrentSessionRevoked = (): boolean => {
  const { currentAccount, currentAddress } = useCurrentAccount();
  const { sessions } = useSessions();

  return useMemo(() => {
    if (!currentAccount || !isSessionAccount(currentAccount)) return false;
    if (!currentAddress) return false;
    const match = sessions.find((s) => s.sessionAddr === currentAddress);
    return match?.status === 'REVOKED';
  }, [currentAccount, currentAddress, sessions]);
};
