import { useEffect, useMemo } from 'react';
import { Account, isSessionAccount } from 'adena-module';

import { shouldConvertMissingSession } from '@common/utils/session-chain-visibility';
import { useLoadAccounts } from './use-load-accounts';
import { useNetwork } from './use-network';
import { useAdenaContext, useWalletContext } from './use-context';
import { useConvertSessionAccounts } from './wallet/use-convert-session-accounts';

// Hides SessionAccount entries that were issued on a chainId other than the
// currently selected network. Phase 5 J 섹션 정책: a session can only sign
// on the network it was issued on, so showing wrong-chain sessions only
// leads to dead-end clicks. The signing guard still has chain_mismatch as
// a final safety net for any state desync.
export const useVisibleAccounts = (): Account[] => {
  const { accounts } = useLoadAccounts();
  const { sessionRepository } = useAdenaContext();
  const { gnoProvider } = useWalletContext();
  const { currentNetwork } = useNetwork();
  const { convertBySessionAddresses } = useConvertSessionAccounts();
  const currentChainId = currentNetwork?.chainId;

  useEffect(() => {
    if (!currentChainId || !gnoProvider || !currentNetwork) {
      return undefined;
    }

    let cancelled = false;

    const syncRevokedSessions = async (): Promise<void> => {
      const revokedSessionAddrs: string[] = [];
      for (const account of accounts) {
        if (!isSessionAccount(account)) continue;
        if (account.sessionConfig.chainId !== currentChainId) continue;

        const sessionAddr = await account
          .getAddress(currentNetwork.addressPrefix)
          .catch(() => null);
        if (!sessionAddr) continue;

        try {
          const cached = await sessionRepository.get(sessionAddr).catch(() => null);
          const record = await gnoProvider.getSession(
            account.getMasterAddress(),
            sessionAddr,
          );

          if (record) {
            continue;
          }

          const shouldConvert = await shouldConvertMissingSession(
            cached,
            async () =>
              !!(await gnoProvider.getSession(account.getMasterAddress(), sessionAddr)),
          );
          if (cancelled) {
            return;
          }
          if (shouldConvert) {
            revokedSessionAddrs.push(sessionAddr);
          }
        } catch {
          // Network and parser failures are not revoke signals.
        }
      }

      if (!cancelled && revokedSessionAddrs.length > 0) {
        await convertBySessionAddresses(revokedSessionAddrs);
      }
    };

    syncRevokedSessions().catch(() => undefined);

    return (): void => {
      cancelled = true;
    };
  }, [
    accounts,
    currentChainId,
    currentNetwork,
    gnoProvider,
    sessionRepository,
    convertBySessionAddresses,
  ]);

  return useMemo(() => {
    if (!currentChainId) {
      return accounts;
    }
    return accounts.filter((account) => {
      if (!isSessionAccount(account)) {
        return true;
      }
      const sessionChainId = (account as { sessionConfig?: { chainId?: string } })
        .sessionConfig?.chainId;
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
