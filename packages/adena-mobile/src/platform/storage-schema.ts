/**
 * The shape of the data on disk, versioned from the first release so later
 * changes can be migrated instead of guessed. Version 1 is the layout the
 * extension's repositories read today (INSTALL_DEFAULTS in storage.ts
 * stands in for its install-time migration).
 */

export const SCHEMA_VERSION_KEY = '__adena_schema_version__';

/** The storage a migration works on: the raw MMKV files, values as JSON. */
export interface SchemaStore {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
  getAllKeys(): string[];
}

export interface Migration {
  /** The version this migration produces; the list is ordered by it. */
  version: number;
  migrate(stores: {local: SchemaStore; cache: SchemaStore}): void;
}

/**
 * Append a migration (version 2, 3, …) whenever stored data changes shape,
 * and never edit one that has shipped. The cache may simply be cleared.
 */
export const MIGRATIONS: readonly Migration[] = [];

export const CURRENT_SCHEMA_VERSION = MIGRATIONS.reduce(
  (latest, migration) => Math.max(latest, migration.version),
  1,
);

/**
 * Brings both stores to `CURRENT_SCHEMA_VERSION`. Data without a version
 * was written before versioning existed and counts as version 1; a store
 * without any data starts at the current version. Data from a newer app
 * is refused, since this version cannot know its shape.
 */
export function migrateStorage(
  stores: {local: SchemaStore; cache: SchemaStore},
  ignoredKeys: readonly string[],
  migrations: readonly Migration[] = MIGRATIONS,
): number {
  const latest = migrations.reduce(
    (version, migration) => Math.max(version, migration.version),
    1,
  );
  const {local} = stores;
  const stored = local.getString(SCHEMA_VERSION_KEY);
  const hasData = local
    .getAllKeys()
    .some(key => key !== SCHEMA_VERSION_KEY && !ignoredKeys.includes(key));
  let version = stored !== undefined ? Number(stored) : hasData ? 1 : latest;
  if (!Number.isInteger(version) || version < 1) {
    throw new Error(`Unreadable storage schema version "${stored}"`);
  }
  if (version > latest) {
    throw new Error(
      `Storage was written by a newer app (schema ${version}, this app reads up to ${latest})`,
    );
  }
  const pending = [...migrations]
    .filter(migration => migration.version > version)
    .sort((a, b) => a.version - b.version);
  for (const migration of pending) {
    migration.migrate(stores);
    version = migration.version;
    // Saved after each step so an interrupted run resumes where it stopped.
    local.set(SCHEMA_VERSION_KEY, String(version));
  }
  local.set(SCHEMA_VERSION_KEY, String(version));
  return version;
}
