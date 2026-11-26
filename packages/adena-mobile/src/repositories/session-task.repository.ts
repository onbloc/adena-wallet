import { SessionTask } from '../domain/session-task';
import { StorageKey } from '../migration/storage-keys';
import { KeyValueStore, readJson, writeJson } from '../storage/key-value-store';

// Kept small: finished tasks beyond this are dropped, oldest first.
const MAX_TASKS = 50;

// Non-secret task records; the keys they run with live only in memory.
export class StorageSessionTaskRepository {
  constructor(private readonly store: KeyValueStore) {}

  list(): SessionTask[] {
    const tasks = readJson<SessionTask[]>(this.store, StorageKey.SESSION_TASKS);

    return Array.isArray(tasks) ? tasks.filter(task => task && typeof task.id === 'string') : [];
  }

  save(task: SessionTask): void {
    const others = this.list().filter(item => item.id !== task.id);

    writeJson(this.store, StorageKey.SESSION_TASKS, [task, ...others].sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_TASKS));
  }
}
