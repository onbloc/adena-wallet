import {
  buildTokenOrderScope,
  clearTokenOrderCache,
  readTokenOrder,
  TOKEN_ORDER_CACHE_KEY_PREFIX,
  TOKEN_ORDER_EPOCH_CACHE_KEY,
  writeTokenOrder,
} from './token-order-cache';

/** Stands in for the whole `chrome.storage.local` area, shared by every context. */
const mockArea: Record<string, unknown> = {};

/** When set, holds entry writes open until it resolves. */
let mockSetGate: Promise<void> | null = null;

/** When set, holds reads of the generation open until it resolves. */
let mockEpochReadGate: Promise<void> | null = null;

/** Subscribers registered through the mocked `chrome.storage.onChanged`. */
const mockChangeListeners: ((changes: Record<string, unknown>, areaName: string) => void)[] = [];

(global as unknown as { chrome: unknown }).chrome = {
  storage: {
    onChanged: {
      addListener: (listener: (changes: Record<string, unknown>, area: string) => void): void => {
        mockChangeListeners.push(listener);
      },
    },
  },
};

/** Delivers the event Chrome would raise when a reset changes the generation. */
function announceReset(): void {
  for (const listener of [...mockChangeListeners]) {
    listener({ TOKEN_ORDER_EPOCH: { newValue: 1 } }, 'local');
  }
}

jest.mock('@common/storage', () => {
  const actual = jest.requireActual('@common/storage');

  class MockChromeCacheStorage {
    get = jest.fn(async (key: string) => {
      if (mockEpochReadGate && key === 'TOKEN_ORDER_EPOCH') {
        await mockEpochReadGate;
      }
      return mockArea[key];
    });

    set = jest.fn(async (key: string, value: unknown) => {
      // Entry writes only: gating the epoch write too would deadlock a reset
      // against the very write it is waiting to observe.
      if (mockSetGate && key.startsWith('TOKEN_ORDER:')) {
        await mockSetGate;
      }
      mockArea[key] = value;
    });

    remove = jest.fn(async (key: string) => {
      delete mockArea[key];
    });

    getByPrefix = jest.fn(async (prefix: string) =>
      Object.fromEntries(Object.entries(mockArea).filter(([key]) => key.startsWith(prefix))),
    );
  }

  return { ...actual, ChromeCacheStorage: MockChromeCacheStorage };
});

type CacheModule = typeof import('./token-order-cache');

/**
 * A second copy of the module, standing in for another extension window: its
 * own module-local state, the same `mockArea` behind it.
 */
function loadInAnotherWindow(): CacheModule {
  let other: CacheModule = null as unknown as CacheModule;
  jest.isolateModules(() => {
    other = require('./token-order-cache');
  });
  return other;
}

function entryKeys(): string[] {
  return Object.keys(mockArea).filter((key) => key.startsWith(TOKEN_ORDER_CACHE_KEY_PREFIX));
}

/** Holds entry writes open until the returned function is called. */
function holdWrites(): () => void {
  let release: () => void = () => undefined;
  mockSetGate = new Promise<void>((resolve) => {
    release = resolve;
  });
  return () => {
    mockSetGate = null;
    release();
  };
}

/**
 * The real call pattern: a screen reads the order, then saves under the
 * generation that read handed back.
 */
async function readThenWrite(scope: string, order: string[]): Promise<void> {
  const { epoch } = await readTokenOrder(scope);
  return writeTokenOrder(scope, order, epoch);
}

async function orderOf(scope: string): Promise<string[] | null> {
  return (await readTokenOrder(scope)).order;
}

const SCOPE_A = buildTokenOrderScope('account-1', 'gnoland-1', 'atomone-1');
const SCOPE_B = buildTokenOrderScope('account-2', 'gnoland-1', 'atomone-1');

describe('token order cache', () => {
  beforeEach(() => {
    for (const key of Object.keys(mockArea)) {
      delete mockArea[key];
    }
    mockSetGate = null;
    mockEpochReadGate = null;
    jest.clearAllMocks();
  });

  /** Holds reads of the generation open until the returned function is called. */
  function holdEpochReads(): () => void {
    let release: () => void = () => undefined;
    mockEpochReadGate = new Promise<void>((resolve) => {
      release = resolve;
    });
    return () => {
      mockEpochReadGate = null;
      release();
    };
  }

  it('reads back the order it stored', async () => {
    await readThenWrite(SCOPE_A, ['gnot:gnoland-1', 'gno.land/r/demo/foo:gnoland-1']);

    expect(await orderOf(SCOPE_A)).toEqual(['gnot:gnoland-1', 'gno.land/r/demo/foo:gnoland-1']);
  });

  it('returns null when nothing is stored for the scope', async () => {
    await readThenWrite(SCOPE_A, ['gnot:gnoland-1']);

    expect(await orderOf(SCOPE_B)).toBeNull();
  });

  it('gives every scope its own key, so a write cannot clobber another', async () => {
    const other = buildTokenOrderScope('account-1', 'test5', null);

    await Promise.all([readThenWrite(SCOPE_A, ['a:gnoland-1']), readThenWrite(other, ['b:test5'])]);

    expect(await orderOf(SCOPE_A)).toEqual(['a:gnoland-1']);
    expect(await orderOf(other)).toEqual(['b:test5']);
  });

  it('keeps a writer in another window from dropping this scope', async () => {
    const otherWindow = loadInAnotherWindow();

    await readThenWrite(SCOPE_A, ['a:gnoland-1']);
    const { epoch } = await otherWindow.readTokenOrder(SCOPE_B);
    await otherWindow.writeTokenOrder(SCOPE_B, ['b:gnoland-1'], epoch);
    await readThenWrite(SCOPE_A, ['a:gnoland-1', 'c:gnoland-1']);

    expect(await orderOf(SCOPE_A)).toEqual(['a:gnoland-1', 'c:gnoland-1']);
    expect(await orderOf(SCOPE_B)).toEqual(['b:gnoland-1']);
  });

  it('replaces the stored order when the rows move', async () => {
    await readThenWrite(SCOPE_A, ['a:gnoland-1', 'b:gnoland-1']);
    await readThenWrite(SCOPE_A, ['b:gnoland-1', 'a:gnoland-1']);

    expect(await orderOf(SCOPE_A)).toEqual(['b:gnoland-1', 'a:gnoland-1']);
  });

  it('evicts the stalest scopes and keeps the one just written', async () => {
    for (let index = 0; index < 40; index += 1) {
      await readThenWrite(buildTokenOrderScope(`account-${index}`, 'gnoland-1', 'atomone-1'), [
        `token-${index}:gnoland-1`,
      ]);
    }

    expect(entryKeys().length).toBe(32);
    expect(await orderOf(buildTokenOrderScope('account-39', 'gnoland-1', 'atomone-1'))).toEqual([
      'token-39:gnoland-1',
    ]);
  });

  it('leaves other cache keys alone when pruning', async () => {
    mockArea['GRC721_SYNC'] = { untouched: true };

    for (let index = 0; index < 40; index += 1) {
      await readThenWrite(buildTokenOrderScope(`account-${index}`, 'gnoland-1', 'atomone-1'), [
        `token-${index}:gnoland-1`,
      ]);
    }

    expect(mockArea['GRC721_SYNC']).toEqual({ untouched: true });
  });

  it('treats a malformed stored value as no order at all', async () => {
    await readThenWrite(SCOPE_A, ['a:gnoland-1']);
    const [key] = entryKeys();
    mockArea[key] = { order: 'not-an-array', updatedAt: 1 };

    expect(await orderOf(SCOPE_A)).toBeNull();
  });

  it('survives a storage read that throws', async () => {
    await readThenWrite(SCOPE_A, ['a:gnoland-1']);
    const [key] = entryKeys();
    Object.defineProperty(mockArea, key, {
      configurable: true,
      enumerable: true,
      get() {
        throw new Error('storage unavailable');
      },
    });

    expect(await orderOf(SCOPE_A)).toBeNull();
  });

  describe('wallet reset', () => {
    it('drops every stored order, and only those', async () => {
      mockArea['GRC721_SYNC'] = { untouched: true };
      await readThenWrite(SCOPE_A, ['a:gnoland-1']);
      await readThenWrite(SCOPE_B, ['b:gnoland-1']);

      await clearTokenOrderCache();

      expect(entryKeys()).toEqual([]);
      expect(mockArea['GRC721_SYNC']).toEqual({ untouched: true });
    });

    it('removes an order whose write was still in flight', async () => {
      const { epoch } = await readTokenOrder(SCOPE_A);
      const release = holdWrites();

      // The write has called `storage.set`, which has not landed yet — a bare
      // prefix scan would see nothing and let the set restore the key after.
      const writing = writeTokenOrder(SCOPE_A, ['a:gnoland-1'], epoch);
      const clearing = clearTokenOrderCache();
      release();
      await Promise.all([writing, clearing]);

      expect(await orderOf(SCOPE_A)).toBeNull();
      expect(entryKeys()).toEqual([]);
    });

    it('drops a write still queued behind it', async () => {
      const { epoch } = await readTokenOrder(SCOPE_A);
      const release = holdWrites();

      const first = writeTokenOrder(SCOPE_A, ['a:gnoland-1'], epoch);
      const second = writeTokenOrder(SCOPE_B, ['b:gnoland-1'], epoch);
      const clearing = clearTokenOrderCache();
      release();
      await Promise.all([first, second, clearing]);

      // The first landed and was removed; the second never ran at all.
      expect(await orderOf(SCOPE_A)).toBeNull();
      expect(await orderOf(SCOPE_B)).toBeNull();
      expect(entryKeys()).toEqual([]);
    });

    it('drops another window write that read its rows before the reset', async () => {
      const otherWindow = loadInAnotherWindow();

      // Window B loaded the rows while the wallet still existed.
      const { epoch } = await otherWindow.readTokenOrder(SCOPE_A);
      await clearTokenOrderCache();

      // It only gets round to saving them afterwards.
      await otherWindow.writeTokenOrder(SCOPE_A, ['a:gnoland-1'], epoch);

      expect(await orderOf(SCOPE_A)).toBeNull();
      expect(entryKeys()).toEqual([]);
    });

    it('drops another window write held open across the reset', async () => {
      const otherWindow = loadInAnotherWindow();
      const { epoch } = await otherWindow.readTokenOrder(SCOPE_A);
      const release = holdWrites();

      // Window B is inside `storage.set` and cannot be called back; window A
      // resets. B's module-local state is invisible to A.
      const writingInB = otherWindow.writeTokenOrder(SCOPE_A, ['a:gnoland-1'], epoch);
      const clearing = clearTokenOrderCache();
      release();
      await Promise.all([writingInB, clearing]);

      expect(await orderOf(SCOPE_A)).toBeNull();
      expect(await otherWindow.readTokenOrder(SCOPE_A).then((read) => read.order)).toBeNull();
      expect(entryKeys()).toEqual([]);
    });

    it('drops a write whose read was overtaken by the reset', async () => {
      const otherWindow = loadInAnotherWindow();
      const release = holdEpochReads();

      // Window B starts reading and parks in `readEpoch`; window A resets, so
      // B's read comes back holding the generation that replaced the wallet.
      const readingInB = otherWindow.readTokenOrder(SCOPE_A);
      mockEpochReadGate = null;
      await clearTokenOrderCache();
      announceReset();
      release();
      const { epoch } = await readingInB;

      await otherWindow.writeTokenOrder(SCOPE_A, ['a:gnoland-1'], epoch);

      expect(await orderOf(SCOPE_A)).toBeNull();
      expect(entryKeys()).toEqual([]);
    });

    it('drops a write asked for before a reset it did not read across', async () => {
      const otherWindow = loadInAnotherWindow();
      const { epoch } = await otherWindow.readTokenOrder(SCOPE_A);

      await clearTokenOrderCache();
      announceReset();

      await otherWindow.writeTokenOrder(SCOPE_A, ['a:gnoland-1'], epoch);

      expect(entryKeys()).toEqual([]);
    });

    it('removes a stranded entry on any later read, not just the first', async () => {
      await readThenWrite(SCOPE_A, ['a:gnoland-1']);
      await clearTokenOrderCache();
      await readTokenOrder(SCOPE_B);

      // A late set from another window lands only now, after the first sweep.
      mockArea[`${TOKEN_ORDER_CACHE_KEY_PREFIX}0:${SCOPE_A}`] = {
        order: ['a:gnoland-1'],
        updatedAt: Date.now(),
      };

      await readTokenOrder(SCOPE_B);

      expect(entryKeys()).toEqual([]);
    });

    it('removes a stranded entry on the next read, with no write in between', async () => {
      await readThenWrite(SCOPE_A, ['a:gnoland-1']);
      await clearTokenOrderCache();

      // Exactly what a set that landed after the sweep leaves behind.
      mockArea[`${TOKEN_ORDER_CACHE_KEY_PREFIX}0:${SCOPE_A}`] = {
        order: ['a:gnoland-1'],
        updatedAt: Date.now(),
      };

      // A read is enough; nothing has to be written for the key to go.
      await readTokenOrder(SCOPE_B);

      expect(entryKeys()).toEqual([]);
    });

    it('stores again normally once it is done', async () => {
      await readThenWrite(SCOPE_A, ['a:gnoland-1']);
      await clearTokenOrderCache();

      const fresh = buildTokenOrderScope('new-account', 'gnoland-1', 'atomone-1');
      await readThenWrite(fresh, ['c:gnoland-1']);

      expect(await orderOf(fresh)).toEqual(['c:gnoland-1']);
      expect(mockArea[TOKEN_ORDER_EPOCH_CACHE_KEY]).toBe(1);
    });
  });
});
