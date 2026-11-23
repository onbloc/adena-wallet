import { readJson, writeJson } from '../../../src/storage/key-value-store';
import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';

describe('readJson / writeJson', () => {
  it('round-trips JSON values', () => {
    const store = new MemoryKeyValueStore();

    writeJson(store, 'k', { a: [1, '한글'], b: null });
    expect(store.getString('k')).toBe('{"a":[1,"한글"],"b":null}');
    expect(readJson(store, 'k')).toEqual({ a: [1, '한글'], b: null });
  });

  it('returns undefined for missing keys and malformed JSON', () => {
    const store = new MemoryKeyValueStore();

    expect(readJson(store, 'missing')).toBeUndefined();
    store.setString('bad', '{not json');
    expect(readJson(store, 'bad')).toBeUndefined();
    store.setString('empty', '');
    expect(readJson(store, 'empty')).toBeUndefined();
  });

  it('stores primitives', () => {
    const store = new MemoryKeyValueStore();

    writeJson(store, 'n', 0);
    writeJson(store, 's', '');
    expect(readJson(store, 'n')).toBe(0);
    expect(readJson(store, 's')).toBe('');
  });
});
