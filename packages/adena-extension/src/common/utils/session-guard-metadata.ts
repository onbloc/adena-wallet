import { GnoProvider } from '@common/provider/gno/gno-provider';
import { flattenSessionAccount } from '@common/provider/gno/utils';
import { SessionMetadata } from '@services/transaction';

// Builds session-guard metadata from the CHAIN-authoritative session record.
//
// spendUsed / spendReset / status / expiresAt / allowPaths / spendLimit /
// spendPeriod / masterAddress come from chain; createdAt / txHash fall back to
// the cached SESSIONS row. A locally-REVOKED status is preserved (local-only
// signal between a revoke broadcast and the next chain re-fetch).
//
// Returns null when the session is not found on chain (revoked or
// expired-and-pruned) so the caller's guard blocks (fail closed). This lets the
// pre-sign recheck evaluate the guard against fresh chain state instead of the
// stale local cache, so a spend/revoke made in another tab or on another device
// cannot slip through.
export async function refreshSessionMetadataFromChain(
  gnoProvider: GnoProvider,
  masterAddress: string,
  sessionAddr: string,
  chainId: string,
  cached: SessionMetadata | null,
  nowSeconds: number,
): Promise<SessionMetadata | null> {
  const res = await gnoProvider.getSession(masterAddress, sessionAddr);
  if (!res) {
    return null;
  }

  const flat = flattenSessionAccount(res);
  const base = res.BaseSessionAccount;
  const expiresAt = Number(flat.expiresAt || cached?.expiresAt || 0);
  const status: SessionMetadata['status'] =
    cached?.status === 'REVOKED'
      ? 'REVOKED'
      : expiresAt > 0 && nowSeconds >= expiresAt
      ? 'EXPIRED'
      : 'ACTIVE';
  const spendUsed = base.spend_used === '' ? undefined : base.spend_used;
  const spendReset =
    base.spend_reset != null && base.spend_reset !== '' ? Number(base.spend_reset) : undefined;

  return {
    masterAddress: flat.masterAddress || cached?.masterAddress || masterAddress,
    chainId: cached?.chainId ?? chainId,
    allowPaths: flat.allowPaths ?? cached?.allowPaths ?? [],
    spendLimit: flat.spendLimit || cached?.spendLimit || '',
    spendPeriod: Number(flat.spendPeriod || cached?.spendPeriod || 0),
    spendUsed,
    spendReset,
    expiresAt,
    status,
    createdAt: cached?.createdAt ?? nowSeconds,
    txHash: cached?.txHash,
  };
}
