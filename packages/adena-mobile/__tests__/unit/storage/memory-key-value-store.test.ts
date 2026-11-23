import { MemoryKeyValueStore } from '../../../src/storage/memory-key-value-store';

describe('MemoryKeyValueStore', () => {
  it('sets, gets, removes and lists keys', () => {
    const store = new MemoryKeyValueStore();

    expect(store.getString('a')).toBeUndefined();
    store.setString('a', '1');
    store.setString('b', '');
    store.setString('a', '2');
    expect(store.getString('a')).toBe('2');
    expect(store.getString('b')).toBe('');
    expect(store.getAllKeys()).toEqual(['a', 'b']);
    store.remove('a');
    store.remove('missing');
    expect(store.getAllKeys()).toEqual(['b']);
  });

  it('clears everything', () => {
    const store = new MemoryKeyValueStore();

    store.setString('a', '1');
    store.clearAll();
    expect(store.getAllKeys()).toEqual([]);
  });

  it('isolates instances', () => {
    const first = new MemoryKeyValueStore();

    first.setString('a', '1');
    expect(new MemoryKeyValueStore().getString('a')).toBeUndefined();
  });
});
