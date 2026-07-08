import { StorageManager } from '@common/storage/storage-manager';
import { SessionMetadataV021 } from '@migrates/migrations/v021/storage-model-v021';
import { SessionMetadata } from '@services/index';

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

  // Serializes mutations so concurrent callers (convert / revoke / chain-sync /
  // import — several fire from useEffects on account or network change) cannot
  // clobber each other. Each mutation reads, modifies, and persists the whole
  // map; without serialization a slow read-modify-write could persist a stale
  // snapshot over a newer write and resurrect a just-deleted row (or drop one).
  private writeChain: Promise<unknown> = Promise.resolve();

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
    return this.mutate((sessions) => {
      sessions[sessionAddr] = metadata;
    });
  }

  public async setMany(
    entries: Array<{ sessionAddr: string; metadata: SessionMetadataV021 }>,
  ): Promise<void> {
    if (entries.length === 0) {
      return;
    }
    return this.mutate((sessions) => {
      for (const entry of entries) {
        sessions[entry.sessionAddr] = entry.metadata;
      }
    });
  }

  // syncFromChain reflects the authoritative chain state into the display
  // cache. Only spendUsed / spendReset / status are accepted because those
  // are the fields chain updates over a session's lifecycle; all other
  // fields (masterAddress, chainId, allowPaths, spendLimit, spendPeriod,
  // expiresAt, createdAt, txHash) are immutable once created.
  public async syncFromChain(
    sessionAddr: string,
    partial: Pick<SessionMetadata, 'spendUsed' | 'spendReset' | 'status'>,
  ): Promise<void> {
    return this.mutate((sessions) => {
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
    });
  }

  public async setStatus(sessionAddr: string, status: SessionMetadata['status']): Promise<void> {
    return this.mutate((sessions) => {
      const existing = sessions[sessionAddr];
      if (!existing) {
        return;
      }
      sessions[sessionAddr] = { ...existing, status };
    });
  }

  public async remove(sessionAddr: string): Promise<void> {
    return this.mutate((sessions) => {
      delete sessions[sessionAddr];
    });
  }

  public async clear(): Promise<void> {
    return this.enqueue(() => this.localStorage.remove('SESSIONS'));
  }

  // Runs read-modify-write atomically with respect to other mutations by
  // chaining onto writeChain. Persisting an unchanged map (no-op mutations) is
  // harmless, so callers keep their early-return guards inside `fn`.
  private mutate(fn: (sessions: SessionsMap) => void): Promise<void> {
    return this.enqueue(async () => {
      const sessions = await this.getAll();
      fn(sessions);
      await this.persist(sessions);
    });
  }

  private enqueue(task: () => Promise<void>): Promise<void> {
    const run = this.writeChain.then(task);
    // Keep the chain alive after a rejection so later writes still run.
    this.writeChain = run.catch(() => undefined);
    return run;
  }

  private async persist(sessions: SessionsMap): Promise<void> {
    await this.localStorage.set('SESSIONS', JSON.stringify(sessions));
  }
}
