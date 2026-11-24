// Storage abstraction for general (non-secret) app data. Repositories depend on
// this interface only; the concrete engine (MMKV, memory) is chosen in the DI container.
export interface KeyValueStore {
  getString(key: string): string | undefined;
  setString(key: string, value: string): void;
  remove(key: string): void;
  getAllKeys(): string[];
  clearAll(): void;
}

export const readJson = <T>(store: KeyValueStore, key: string): T | undefined => {
  const raw = store.getString(key);

  if (raw === undefined) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as T;
  }
  catch {
    return undefined;
  }
};

export const writeJson = <T>(store: KeyValueStore, key: string, value: T): void => {
  store.setString(key, JSON.stringify(value));
};
