import { readAutoLockMinutes } from './auto-lock-timer';

type StorageGet = (key: string) => Promise<{ ADENA_DATA?: string | object }>;

const mockChromeStorage = (get: StorageGet): void => {
  (globalThis as unknown as { chrome: unknown }).chrome = {
    storage: {
      local: { get },
    },
  };
};

const dataBlob = (autoLockValue: unknown): string =>
  JSON.stringify({ data: { AUTO_LOCK_TIMEOUT_MINUTES: autoLockValue } });

describe('readAutoLockMinutes', () => {
  afterEach(() => {
    delete (globalThis as unknown as { chrome?: unknown }).chrome;
  });

  it('returns the default 5 minutes when ADENA_DATA is absent', async () => {
    mockChromeStorage(async () => ({}));

    expect(await readAutoLockMinutes()).toBe(5);
  });

  it('returns the default when the AUTO_LOCK_TIMEOUT_MINUTES key is missing', async () => {
    mockChromeStorage(async () => ({ ADENA_DATA: JSON.stringify({ data: {} }) }));

    expect(await readAutoLockMinutes()).toBe(5);
  });

  it('returns the default when the value is an empty string', async () => {
    mockChromeStorage(async () => ({ ADENA_DATA: dataBlob('') }));

    expect(await readAutoLockMinutes()).toBe(5);
  });

  it('returns the configured number for valid stringified integers', async () => {
    mockChromeStorage(async () => ({ ADENA_DATA: dataBlob('15') }));

    expect(await readAutoLockMinutes()).toBe(15);
  });

  it('returns 0 to honor the explicit "auto-lock disabled" setting', async () => {
    mockChromeStorage(async () => ({ ADENA_DATA: dataBlob('0') }));

    expect(await readAutoLockMinutes()).toBe(0);
  });

  it('falls back to the default for non-numeric strings', async () => {
    mockChromeStorage(async () => ({ ADENA_DATA: dataBlob('abc') }));

    expect(await readAutoLockMinutes()).toBe(5);
  });

  it('falls back to the default for negative values', async () => {
    mockChromeStorage(async () => ({ ADENA_DATA: dataBlob('-3') }));

    expect(await readAutoLockMinutes()).toBe(5);
  });

  it('falls back to the default when ADENA_DATA contains malformed JSON', async () => {
    mockChromeStorage(async () => ({ ADENA_DATA: 'not-json' }));

    expect(await readAutoLockMinutes()).toBe(5);
  });

  it('falls back to the default when chrome.storage rejects', async () => {
    mockChromeStorage(() => Promise.reject(new Error('storage unavailable')));

    expect(await readAutoLockMinutes()).toBe(5);
  });

  it('accepts an already-parsed object payload', async () => {
    mockChromeStorage(async () => ({
      ADENA_DATA: { data: { AUTO_LOCK_TIMEOUT_MINUTES: '30' } },
    }));

    expect(await readAutoLockMinutes()).toBe(30);
  });
});
