import { StorageManager } from '@common/storage/storage-manager';
import { SessionMetadataV021 } from '@migrates/migrations/v021/storage-model-v021';

type LocalValueType = 'SESSIONS';

type SessionsMap = Record<string, SessionMetadataV021>;

// Read/write helper for the SESSIONS storage key introduced in v020.
//
// Storage shape: { [sessionAddr: string]: SessionMetadataV021 } flat map,
// origin-agnostic (a session is not tied to a dApp; see Phase 4 doc).
//
// Source-of-truth policy: spendUsed / spendReset / status are authoritative
// on chain. wallet stores them only as a display cache. syncFromChain() is
// the only path that updates spendUsed/spendReset; signing flows must not
// call updateSpendUsed and must not increment spendUsed locally.
export class SessionRepository {
  private localStorage: StorageManager<LocalValueType>;

  constructor(localStorage: StorageManager) {
    this.localStorage = localStorage;
  }

  public async get(sessionAddr: string): Promise<SessionMetadataV021 | null> {
    const sessions = await this.getAll();
    return sessions[sessionAddr] ?? null;
  }

  public async getAll(): Promise<SessionsMap> {
    const raw = await this.localStorage.get('SESSIONS');
    if (!raw) {
      return {};
    }
    try {
      const parsed = JSON.parse(raw) as SessionsMap;
      return parsed ?? {};
    } catch {
      return {};
    }
  }

  public async set(sessionAddr: string, metadata: SessionMetadataV021): Promise<void> {
    const sessions = await this.getAll();
    sessions[sessionAddr] = metadata;
    await this.persist(sessions);
  }

  public async setMany(
    entries: Array<{ sessionAddr: string; metadata: SessionMetadataV021 }>,
  ): Promise<void> {
    if (entries.length === 0) {
      return;
    }
    const sessions = await this.getAll();
    for (const entry of entries) {
      sessions[entry.sessionAddr] = entry.metadata;
    }
    await this.persist(sessions);
  }

  // syncFromChain reflects the authoritative chain state into the display
  // cache. Only spendUsed / spendReset / status are accepted because those
  // are the fields chain updates over a session's lifecycle; all other
  // fields (masterAddress, chainId, allowPaths, spendLimit, spendPeriod,
  // expiresAt, createdAt, txHash) are immutable once created.
  public async syncFromChain(
    sessionAddr: string,
    partial: Pick<SessionMetadataV021, 'spendUsed' | 'spendReset' | 'status'>,
  ): Promise<void> {
    const sessions = await this.getAll();
    const existing = sessions[sessionAddr];
    if (!existing) {
      return;
    }
    sessions[sessionAddr] = {
      ...existing,
      spendUsed: partial.spendUsed ?? existing.spendUsed,
      spendReset: partial.spendReset ?? existing.spendReset,
      // Guard like the other fields: a nullish status must not clobber a valid
      // cached ACTIVE/REVOKED with undefined.
      status: partial.status ?? existing.status,
    };
    await this.persist(sessions);
  }

  public async setStatus(
    sessionAddr: string,
    status: SessionMetadataV021['status'],
  ): Promise<void> {
    const sessions = await this.getAll();
    const existing = sessions[sessionAddr];
    if (!existing) {
      return;
    }
    sessions[sessionAddr] = { ...existing, status };
    await this.persist(sessions);
  }

  public async remove(sessionAddr: string): Promise<void> {
    const sessions = await this.getAll();
    if (!(sessionAddr in sessions)) {
      return;
    }
    delete sessions[sessionAddr];
    await this.persist(sessions);
  }

  public async clear(): Promise<void> {
    await this.localStorage.remove('SESSIONS');
  }

  private async persist(sessions: SessionsMap): Promise<void> {
    await this.localStorage.set('SESSIONS', JSON.stringify(sessions));
  }
}
