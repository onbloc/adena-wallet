import { useCallback, useEffect, useState } from 'react';
import { fromBase64 } from '@cosmjs/encoding';
import { isSessionAccount } from 'adena-module';
import { useQueryClient } from '@tanstack/react-query';

import { GNO_ADDRESS_PREFIX as GNO_PREFIX } from '@common/constants/chain.constant';
import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { SESSIONS_QUERY_KEY } from '@hooks/use-sessions';
import { flattenSessionAccount } from '@common/provider/gno/utils';

export interface MasterSessionEntry {
  sessionAddr: string;
  masterAddress: string;
  publicKey: Uint8Array | null;
  name: string;
  imported: boolean;
  expiresAt: number;
  allowPaths: string[];
  spendLimit: string;
  spendPeriod: number;
  spendUsed: string;
  spendReset: number;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
}

interface UseMasterSessionsReturn {
  entries: MasterSessionEntry[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const sessionStatusOf = (expiresAt: number, nowSec: number): 'ACTIVE' | 'EXPIRED' => {
  if (expiresAt <= 0) return 'ACTIVE';
  return nowSec < expiresAt ? 'ACTIVE' : 'EXPIRED';
};

// Lists every session registered on-chain for the given master, merging
// cached metadata (spendUsed/spendReset, status overrides) from the
// SessionRepository and wallet import status. The list is the authoritative
// view: it includes sessions that have not been imported into this wallet,
// which is critical for revoke flows.
export const useMasterSessions = (masterAddress: string | undefined): UseMasterSessionsReturn => {
  const { wallet, gnoProvider } = useWalletContext();
  const { sessionRepository } = useAdenaContext();
  const queryClient = useQueryClient();
  const [entries, setEntries] = useState<MasterSessionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Single fetch implementation shared by the mount effect and refetch().
  // `signal.cancelled` lets an unmounted/superseded run bail out of state
  // updates. Returning the promise makes `await refetch()` actually wait for
  // the fresh data (callers rely on this after a revoke).
  const load = useCallback(
    async (signal?: { cancelled: boolean }): Promise<void> => {
      if (!masterAddress || !gnoProvider) {
        setEntries([]);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const responses = await gnoProvider.getSessions(masterAddress);
        const localMap = await sessionRepository.getAll();

        // Index wallet's session accounts by Gno address so we can reuse the
        // user-visible account name (matches the side-menu / account list
        // and Session Overview header). Non-imported sessions fall back to a
        // chain-index label below.
        const walletSessionNameByAddr = new Map<string, string>();
        if (wallet) {
          for (const account of wallet.accounts) {
            if (!isSessionAccount(account)) continue;
            const addr = await account.getAddress(GNO_PREFIX);
            walletSessionNameByAddr.set(addr, account.name);
          }
        }
        if (signal?.cancelled) return;

        const nowSec = Math.floor(Date.now() / 1000);
        const result: MasterSessionEntry[] = responses.map((res, idx) => {
          const flat = flattenSessionAccount(res);
          const cached = localMap[flat.address];
          let publicKey: Uint8Array | null = null;
          if (flat.publicKey?.value) {
            try {
              publicKey = fromBase64(flat.publicKey.value);
            } catch {
              publicKey = null;
            }
          }
          const expiresAt = Number(flat.expiresAt);
          const chainStatus = sessionStatusOf(expiresAt, nowSec);
          // cached.status takes precedence only when REVOKED (a local-only
          // signal between revoke broadcast + chain re-fetch). Otherwise the
          // chain is authoritative for ACTIVE/EXPIRED.
          const status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' =
            cached?.status === 'REVOKED' ? 'REVOKED' : chainStatus;
          const walletName = walletSessionNameByAddr.get(flat.address);
          const chainLabel = `#${idx + 1}`;
          return {
            sessionAddr: flat.address,
            masterAddress: flat.masterAddress,
            publicKey,
            name: walletName ? `${chainLabel} (${walletName})` : chainLabel,
            imported: walletName !== undefined,
            expiresAt,
            allowPaths: flat.allowPaths,
            spendLimit: flat.spendLimit,
            spendPeriod: Number(flat.spendPeriod || '0'),
            spendUsed: flat.spendUsed,
            spendReset: Number(flat.spendReset || '0'),
            status,
          };
        });

        if (!signal?.cancelled) {
          setEntries(result);
          // Keep the local cache in sync so other surfaces (Session Overview
          // popover, etc.) reflect the latest values pulled from chain.
          void queryClient.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] });
        }
      } catch (e) {
        if (!signal?.cancelled) {
          setError((e as Error)?.message ?? 'Failed to load sessions');
          setEntries([]);
        }
      } finally {
        if (!signal?.cancelled) setIsLoading(false);
      }
    },
    [masterAddress, gnoProvider, wallet, sessionRepository, queryClient],
  );

  useEffect(() => {
    const signal = { cancelled: false };
    void load(signal);
    return (): void => {
      signal.cancelled = true;
    };
  }, [load]);

  const refetch = useCallback((): Promise<void> => load(), [load]);

  return { entries, isLoading, error, refetch };
};
