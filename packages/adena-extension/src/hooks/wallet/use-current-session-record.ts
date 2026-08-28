import { GnoProvider } from '@common/provider/gno/gno-provider';
import { GnoSessionAccountResponse } from '@common/provider/gno/types';

export const SESSION_RECORD_QUERY_KEY = 'session/record';

/**
 * Shared cache key for `auth/accounts/{master}/session/{session}`. The header
 * mounts two pollers over this record — the revocation watcher and the Session
 * Overview — so both read through this key to share one round-trip.
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
