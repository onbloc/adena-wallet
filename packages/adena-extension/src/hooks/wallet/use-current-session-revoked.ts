import { useMemo } from 'react';

import { isRevokedSessionAccount } from '@common/utils/account-session';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useSessions } from '@hooks/use-sessions';

// True when the currently selected account is a SessionAccount that the
// local SessionRepository has flagged REVOKED. Used to swap UI affordances
// (header popover content, main action button disable) so the user is
// guided to remove the now-unsignable session account.
export const useIsCurrentSessionRevoked = (): boolean => {
  const { currentAccount, currentAddress } = useCurrentAccount();
  const { sessions } = useSessions();

  return useMemo(
    () => isRevokedSessionAccount(currentAccount, currentAddress, sessions),
    [currentAccount, currentAddress, sessions],
  );
};
