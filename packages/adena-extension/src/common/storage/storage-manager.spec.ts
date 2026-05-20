import { Storage } from './storage';
import { StorageManager } from './storage-manager';

describe('StorageManager.get', () => {
  let mockStorageGet: jest.Mock;
  let manager: StorageManager;

  beforeEach(() => {
    mockStorageGet = jest.fn();
    const mockStorage = {
      get: mockStorageGet,
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
    } as unknown as Storage;
    manager = new StorageManager(mockStorage);
  });

  it('returns the value coerced to string when present', async () => {
    mockStorageGet.mockResolvedValue('hello');
    expect(await manager.get('KEY')).toBe('hello');
  });

  it('returns an empty string when the value is undefined', async () => {
    mockStorageGet.mockResolvedValue(undefined);
    expect(await manager.get('KEY')).toBe('');
  });

  it('returns an empty string when the value is null', async () => {
    mockStorageGet.mockResolvedValue(null);
    expect(await manager.get('KEY')).toBe('');
  });

  it('coerces numeric values to strings', async () => {
    mockStorageGet.mockResolvedValue(123);
    expect(await manager.get('KEY')).toBe('123');
  });
});
