import {
  CURRENT_SCHEMA_VERSION,
  MIGRATIONS,
  Migration,
  migrateStorage,
  SCHEMA_VERSION_KEY,
  SchemaStore,
} from '../../src/platform/storage-schema';

class Store implements SchemaStore {
  readonly values = new Map<string, string>();
  getString = (key: string) => this.values.get(key);
  set = (key: string, value: string) => {
    this.values.set(key, value);
  };
  delete = (key: string) => {
    this.values.delete(key);
  };
  getAllKeys = () => [...this.values.keys()];
}

const stores = () => ({local: new Store(), cache: new Store()});

// Renames a key, as a real migration would.
const renameVault: Migration = {
  version: 2,
  migrate: ({local}) => {
    const vault = local.getString('SERIALIZED');
    if (vault !== undefined) {
      local.set('VAULT', vault);
      local.delete('SERIALIZED');
    }
  },
};
const clearCache: Migration = {
  version: 3,
  migrate: ({cache}) => cache.getAllKeys().forEach(key => cache.delete(key)),
};

describe('storage schema', () => {
  it('records the version of the latest migration', () => {
    const latest = Math.max(1, ...MIGRATIONS.map(m => m.version));
    expect(CURRENT_SCHEMA_VERSION).toBe(latest);
    const versions = MIGRATIONS.map(m => m.version);
    expect(new Set(versions).size).toBe(versions.length);
  });

  it('starts a new install at the latest version without migrating', () => {
    const s = stores();
    s.local.set('__canary__', 'x');
    const migrate = jest.fn();
    expect(migrateStorage(s, ['__canary__'], [{version: 2, migrate}])).toBe(2);
    expect(migrate).not.toHaveBeenCalled();
    expect(s.local.getString(SCHEMA_VERSION_KEY)).toBe('2');
  });

  it('treats data without a version as version 1 and runs every migration in order', () => {
    const s = stores();
    s.local.set('SERIALIZED', '"vault"');
    s.cache.set('PRICES', '{}');
    expect(migrateStorage(s, [], [clearCache, renameVault])).toBe(3);
    expect(s.local.getString('VAULT')).toBe('"vault"');
    expect(s.local.getString('SERIALIZED')).toBeUndefined();
    expect(s.cache.getAllKeys()).toEqual([]);
    expect(s.local.getString(SCHEMA_VERSION_KEY)).toBe('3');
  });

  it('runs only the migrations after the stored version', () => {
    const s = stores();
    s.local.set(SCHEMA_VERSION_KEY, '2');
    s.local.set('SERIALIZED', '"left alone"');
    expect(migrateStorage(s, [], [renameVault, clearCache])).toBe(3);
    expect(s.local.getString('SERIALIZED')).toBe('"left alone"');
  });

  it('refuses data written by a newer app', () => {
    const s = stores();
    s.local.set(SCHEMA_VERSION_KEY, '9');
    expect(() => migrateStorage(s, [], [renameVault])).toThrow('newer app');
  });

  it('keeps the version reached when a later migration fails', () => {
    const s = stores();
    s.local.set('SERIALIZED', '"vault"');
    const broken: Migration = {
      version: 3,
      migrate: () => {
        throw new Error('boom');
      },
    };
    expect(() => migrateStorage(s, [], [renameVault, broken])).toThrow('boom');
    expect(s.local.getString(SCHEMA_VERSION_KEY)).toBe('2');
  });
});
