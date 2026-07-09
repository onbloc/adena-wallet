import { StorageManager } from '@common/storage/storage-manager';
import { SessionMetadataV021 } from '@migrates/migrations/v021/storage-model-v021';

import { SessionRepository } from './session-repository';

const SESSION_ADDR = 'g1session';

const makeMetadata = (
  status: SessionMetadataV021['status'],
): SessionMetadataV021 => ({
  masterAddress: 'g1master',
  chainId: 'test-13',
  allowPaths: ['*'],
  spendLimit: '1000000ugnot',
  spendPeriod: 0,
  expiresAt: 0,
  status,
  createdAt: 1,
});

// In-memory stand-in for chrome.storage.
const makeStorage = (initial: Record<string, SessionMetadataV021>): StorageManager => {
  let raw: string | null = JSON.stringify(initial);
  return {
    get: jest.fn(async () => raw),
    set: jest.fn(async (_key: string, value: string) => {
      raw = value;
    }),
    remove: jest.fn(async () => {
      raw = null;
    }),
  } as unknown as StorageManager;
};

describe('SessionRepository', () => {
  describe('syncFromChain', () => {
    // The chain still returns a record while a revoke is committing, and callers
    // may hold a snapshot taken before the revoke. Neither may resurrect the
    // session: REVOKED is terminal.
    it('never lets a chain-derived status resurrect a REVOKED session', async () => {
      const repository = new SessionRepository(makeStorage({ [SESSION_ADDR]: makeMetadata('REVOKED') }));

      await repository.syncFromChain(SESSION_ADDR, { status: 'ACTIVE', spendUsed: '5' });

      const stored = await repository.get(SESSION_ADDR);
      expect(stored?.status).toBe('REVOKED');
      // Non-status fields still sync.
      expect(stored?.spendUsed).toBe('5');
    });

    it('applies the chain status to a non-revoked session', async () => {
      const repository = new SessionRepository(makeStorage({ [SESSION_ADDR]: makeMetadata('ACTIVE') }));

      await repository.syncFromChain(SESSION_ADDR, { status: 'EXPIRED' });

      expect((await repository.get(SESSION_ADDR))?.status).toBe('EXPIRED');
    });

    it('keeps the cached status when the chain status is undefined', async () => {
      const repository = new SessionRepository(makeStorage({ [SESSION_ADDR]: makeMetadata('ACTIVE') }));

      await repository.syncFromChain(SESSION_ADDR, {
        status: undefined as unknown as SessionMetadataV021['status'],
      });

      expect((await repository.get(SESSION_ADDR))?.status).toBe('ACTIVE');
    });

    it('ignores an unknown session address', async () => {
      const repository = new SessionRepository(makeStorage({}));

      await repository.syncFromChain(SESSION_ADDR, { status: 'ACTIVE' });

      expect(await repository.get(SESSION_ADDR)).toBeNull();
    });
  });

  describe('setStatus', () => {
    it('flags an existing session REVOKED', async () => {
      const repository = new SessionRepository(makeStorage({ [SESSION_ADDR]: makeMetadata('ACTIVE') }));

      await repository.setStatus(SESSION_ADDR, 'REVOKED');

      expect((await repository.get(SESSION_ADDR))?.status).toBe('REVOKED');
    });
  });
});
