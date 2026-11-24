import { KeyValueStore } from './key-value-store';

export class MemoryKeyValueStore implements KeyValueStore {
  private readonly items = new Map<string, string>();

  getString(key: string): string | undefined {
    return this.items.get(key);
  }

  setString(key: string, value: string): void {
    this.items.set(key, value);
  }

  remove(key: string): void {
    this.items.delete(key);
  }

  getAllKeys(): string[] {
    return [...this.items.keys()];
  }

  clearAll(): void {
    this.items.clear();
  }
}
