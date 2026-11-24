import { StorageKey } from '../../../src/migration/storage-keys';

describe('StorageKey', () => {
  it('uses unique keys', () => {
    const values = Object.values(StorageKey);

    expect(new Set(values).size).toBe(values.length);
    expect(StorageKey.SCHEMA_VERSION).toBe('schema.version');
  });
});
