import { GnoProvider } from '@common/provider/gno/gno-provider';
import { GnoSessionAccountResponse } from '@common/provider/gno/types';

export const SESSION_RECORD_QUERY_KEY = 'session/record';

/**
 * Shared cache key for `auth/accounts/{master}/session/{session}`.
 *
 * The header mounts two independent 5s pollers over this exact record — the
 * revocation watcher and the Session Overview chain data — which used to issue
 * two identical ABCI queries per tick. Both now read through this key so the
 * poll costs one round-trip.
 */
export const sessionRecordQueryKey = (
  masterAddress: string,
  sessionAddress: string,
): [string, string, string] => [SESSION_RECORD_QUERY_KEY, masterAddress, sessionAddress];

export const fetchSessionRecord = (
  gnoProvider: GnoProvider,
  masterAddress: string,
  sessionAddress: string,
): Promise<GnoSessionAccountResponse | null> =>
  gnoProvider.getSession(masterAddress, sessionAddress).then((record) => record ?? null);
