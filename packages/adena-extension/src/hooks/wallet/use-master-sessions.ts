import { useEffect, useState } from 'react';
import { fromBase64 } from '@cosmjs/encoding';
import { isSessionAccount } from 'adena-module';
import { useQueryClient } from '@tanstack/react-query';

import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { SESSIONS_QUERY_KEY } from '@hooks/use-sessions';
import { flattenSessionAccount } from '@common/provider/gno/utils';

const GNO_PREFIX = 'g';

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
  const [tick, setTick] = useState(0);

  const refetch = async (): Promise<void> => {
    setTick((n) => n + 1);
  };

  useEffect(() => {
    if (!masterAddress || !gnoProvider) {
      setEntries([]);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async (): Promise<void> => {
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
        if (cancelled) return;

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

        if (!cancelled) {
          setEntries(result);
          // Keep the local cache in sync so other surfaces (Session Overview
          // popover, etc.) reflect the latest values pulled from chain.
          void queryClient.invalidateQueries({ queryKey: [SESSIONS_QUERY_KEY] });
        }
      } catch (e) {
        if (!cancelled) {
          setError((e as Error)?.message ?? 'Failed to load sessions');
          setEntries([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return (): void => {
      cancelled = true;
    };
  }, [masterAddress, gnoProvider, wallet, sessionRepository, queryClient, tick]);

  return { entries, isLoading, error, refetch };
};
