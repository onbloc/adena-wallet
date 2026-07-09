import { useQuery } from '@tanstack/react-query';

import { flattenSessionAccount } from '@common/provider/gno/utils';
import { useWalletContext } from '@hooks/use-context';
import { SESSION_REVOCATION_POLL_INTERVAL } from '@hooks/wallet/use-session-revocation-watcher';

export interface CurrentSessionChainData {
  allowPaths: string[];
  spendPeriod: number;
  spendReset: number;
  spendUsed: string;
  spendLimit: string;
}

// Fetches fresh chain-side metadata for the (master, session) pair so the
// Session Overview popover renders the same Spend Period countdown as the
// Manage Sessions screen, which already pulls these values from chain via
// useMasterSessions.
//
// Polls on the same interval as the revocation watcher so the overview's
// spend-used / spend-reset / allow-paths stay current while the session is
// active — a session spends as the user transacts, so a one-shot fetch would go
// stale. keepPreviousData avoids flicker to empty on a transient RPC failure.
export const useCurrentSessionChainData = (
  masterAddress: string | undefined,
  sessionAddress: string | undefined,
): CurrentSessionChainData | undefined => {
  const { gnoProvider } = useWalletContext();

  const { data } = useQuery<CurrentSessionChainData | null>(
    ['session/chain-data', masterAddress ?? '', sessionAddress ?? ''],
    async () => {
      if (!gnoProvider || !masterAddress || !sessionAddress) {
        return null;
      }

      const res = await gnoProvider.getSession(masterAddress, sessionAddress);
      if (!res) {
        return null;
      }

      const flat = flattenSessionAccount(res);
      return {
        allowPaths: flat.allowPaths,
        spendPeriod: Number(flat.spendPeriod || '0'),
        spendReset: Number(flat.spendReset || '0'),
        spendUsed: flat.spendUsed,
        spendLimit: flat.spendLimit,
      };
    },
    {
      enabled: !!gnoProvider && !!masterAddress && !!sessionAddress,
      refetchInterval: SESSION_REVOCATION_POLL_INTERVAL,
      refetchOnWindowFocus: true,
      keepPreviousData: true,
    },
  );

  return data ?? undefined;
};
