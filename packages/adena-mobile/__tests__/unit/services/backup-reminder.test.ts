import { BackupReminder } from '../../../src/services/backup-reminder';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';

describe('BackupReminder', () => {
  it('keeps one keyring until it is cleared, and ignores clearing another one', () => {
    const store = new MemoryKeyValueStore();
    const reminder = new BackupReminder(store);

    expect(reminder.getKeyringId()).toBeNull();
    reminder.require('hd-1');
    // Survives a new instance over the same storage, e.g. an app restart.
    expect(new BackupReminder(store).getKeyringId()).toBe('hd-1');

    reminder.clear('hd-2');
    expect(reminder.getKeyringId()).toBe('hd-1');
    reminder.clear('hd-1');
    expect(reminder.getKeyringId()).toBeNull();
  });
});
