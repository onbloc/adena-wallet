import { Account, isSessionAccount } from 'adena-module';
import { useMemo } from 'react';

import { useLoadAccounts } from './use-load-accounts';
import { useNetwork } from './use-network';

// Hides SessionAccount entries that were issued on a chainId other than the
// currently selected network.
//
// Revocation is NOT handled here. A session that disappears from chain used to
// be converted into a regular account from this hook, which meant the (up to
// three) mount sites each fired their own RPC sweep. Revoked sessions are now
// kept as SessionAccounts and flagged by `useSessionRevocationWatcher`, which
// polls only the current account.
export const useVisibleAccounts = (): Account[] => {
  const { accounts } = useLoadAccounts();
  const { currentNetwork } = useNetwork();
  const currentChainId = currentNetwork?.chainId;

  return useMemo(() => {
    if (!currentChainId) {
      return accounts;
    }
    return accounts.filter((account) => {
      if (!isSessionAccount(account)) {
        return true;
      }
      const sessionChainId = (account as { sessionConfig?: { chainId?: string } }).sessionConfig
        ?.chainId;
      // If chainId is missing (legacy data before chainId was added), keep
      // the account visible so users aren't silently locked out. Sessions
      // issued after Phase 7/8 will always carry chainId.
      if (!sessionChainId) {
        return true;
      }
      return sessionChainId === currentChainId;
    });
  }, [accounts, currentChainId]);
};
