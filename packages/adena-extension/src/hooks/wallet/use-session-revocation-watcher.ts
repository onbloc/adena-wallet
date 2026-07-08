import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isSessionAccount } from 'adena-module';

import { GNO_ADDRESS_PREFIX } from '@common/constants/chain.constant';
import { shouldMarkSessionRevoked } from '@common/utils/session-chain-visibility';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { SESSIONS_QUERY_KEY } from '@hooks/use-sessions';

export const SESSION_REVOCATION_POLL_INTERVAL = 5_000;

type WatchResult = 'not-session' | 'revoked' | 'present' | 'unknown';

// Polls the chain for the CURRENT SessionAccount and flags it REVOKED locally
// once it disappears from the master's session store.
//
// The chain deletes the session record on MsgRevokeSession, so "not found" is
// the revoke signal — but only after the creation grace period and a recheck,
// so a freshly created session or a transient node error is never mistaken for
// a revoke. A revoked session is KEPT in the wallet (it is not converted into a
// regular account); the REVOKED status in SESSIONS is what every revoked-state
// surface reads, via `useIsCurrentSessionRevoked`.
//
// Mounted once in the popup header so it runs on every wallet screen.
export const useSessionRevocationWatcher = (): void => {
  const { currentAccount } = useCurrentAccount();
  const { gnoProvider } = useWalletContext();
  const { sessionRepository } = useAdenaContext();
  const queryClient = useQueryClient();

  const isSession = currentAccount !== null && isSessionAccount(currentAccount);

  useQuery<WatchResult>(
    ['session/revocation-watch', currentAccount?.id ?? ''],
    async (): Promise<WatchResult> => {
      if (!currentAccount || !isSessionAccount(currentAccount) || !gnoProvider) {
        return 'not-session';
      }

      const masterAddress = currentAccount.getMasterAddress();
      const sessionAddr = await currentAccount.getAddress(GNO_ADDRESS_PREFIX).catch(() => null);
      if (!sessionAddr) {
        return 'unknown';
      }

      const cached = await sessionRepository.get(sessionAddr).catch(() => null);
      // Revocation is terminal: once flagged, stop paying for the RPC.
      if (cached?.status === 'REVOKED') {
        return 'revoked';
      }

      let record;
      try {
        record = await gnoProvider.getSession(masterAddress, sessionAddr);
      } catch {
        // Network / parse failures are not a revoke signal.
        return 'unknown';
      }
      if (record) {
        return 'present';
      }

      const revoked = await shouldMarkSessionRevoked(cached, () =>
        gnoProvider
          .getSession(masterAddress, sessionAddr)
          .then((res) => !!res)
          .catch(() => true), // treat a failed recheck as "still there"
      );
      if (!revoked) {
        return 'unknown';
      }

      await sessionRepository.setStatus(sessionAddr, 'REVOKED').catch(() => undefined);
      await queryClient.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] });
      return 'revoked';
    },
    {
      enabled: isSession && !!gnoProvider,
      refetchInterval: SESSION_REVOCATION_POLL_INTERVAL,
      refetchOnWindowFocus: true,
    },
  );
};
