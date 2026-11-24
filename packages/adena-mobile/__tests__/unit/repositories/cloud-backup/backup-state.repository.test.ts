import { StorageKey } from '../../../../src/migration/storage-keys';
import { StorageCloudBackupStateRepository } from '../../../../src/repositories/cloud-backup/backup-state.repository';
import { MemoryKeyValueStore } from '../../../../src/storage/memory-key-value-store';

const STATE = { backupId: 'id', fileName: 'f.json', backedUpAt: 1, revision: 3, fingerprint: 'fp', mnemonicCount: 1, privateKeyCount: 0 };

describe('StorageCloudBackupStateRepository', () => {
  it('saves, reads and clears the state', () => {
    const store = new MemoryKeyValueStore();
    const repository = new StorageCloudBackupStateRepository(store);

    expect(repository.get()).toBeNull();
    repository.save(STATE);
    expect(repository.get()).toEqual(STATE);
    expect(store.getString(StorageKey.CLOUD_BACKUP)).toBeDefined();
    repository.clear();
    expect(repository.get()).toBeNull();
  });

  it('reads a record saved before revisions existed as revision 0', () => {
    const store = new MemoryKeyValueStore();
    const { revision: _revision, ...legacy } = STATE;

    store.setString(StorageKey.CLOUD_BACKUP, JSON.stringify(legacy));
    expect(new StorageCloudBackupStateRepository(store).get()).toEqual({ ...STATE, revision: 0 });
  });

  it('ignores malformed records', () => {
    const store = new MemoryKeyValueStore();

    store.setString(StorageKey.CLOUD_BACKUP, JSON.stringify({ ...STATE, backedUpAt: 'yesterday' }));
    expect(new StorageCloudBackupStateRepository(store).get()).toBeNull();
    store.setString(StorageKey.CLOUD_BACKUP, '{');
    expect(new StorageCloudBackupStateRepository(store).get()).toBeNull();
  });
});
