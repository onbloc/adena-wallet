import { useQuery } from '@tanstack/react-query';

import { useAdenaContext } from './use-context';
import { SessionMetadataV020 } from '@migrates/migrations/v020/storage-model-v020';

export type SessionListItem = SessionMetadataV020 & { sessionAddr: string };

export const SESSIONS_QUERY_KEY = 'sessions/all';

/**
 * Returns the SESSIONS storage map as a flat list, sorted by createdAt desc.
 * Shared by the manage-sessions page (Phase 8 D) and the header expiry icon
 * (Phase 8 E) so both surfaces see the same view.
 */
export const useSessions = (): {
  sessions: SessionListItem[];
  refetch: () => Promise<unknown>;
} => {
  const { sessionRepository } = useAdenaContext();

  const { data: sessions = [], refetch } = useQuery<SessionListItem[]>({
    queryKey: [SESSIONS_QUERY_KEY],
    queryFn: async () => {
      const map = await sessionRepository.getAll();
      return Object.entries(map)
        .map(([sessionAddr, metadata]) => ({ sessionAddr, ...metadata }))
        .sort((a, b) => b.createdAt - a.createdAt);
    },
    refetchInterval: 30_000,
  });

  return { sessions, refetch };
};
