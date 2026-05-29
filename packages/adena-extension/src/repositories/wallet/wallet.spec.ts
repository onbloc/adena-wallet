import { StorageManager } from '@common/storage/storage-manager';
import { WalletRepository } from './wallet';

describe('WalletRepository.getKdfSalt', () => {
  let mockGet: jest.Mock;
  let mockSet: jest.Mock;
  let mockRemove: jest.Mock;
  let repository: WalletRepository;

  beforeEach(() => {
    mockGet = jest.fn();
    mockSet = jest.fn();
    mockRemove = jest.fn();
    const mockLocalStorage = {
      get: mockGet,
      set: mockSet,
      remove: mockRemove,
    } as unknown as StorageManager;
    const mockSessionStorage = {} as unknown as StorageManager;
    repository = new WalletRepository(mockLocalStorage, mockSessionStorage);
  });

  it('returns null when KDF_SALT is missing (empty string)', async () => {
    mockGet.mockResolvedValue('');
    expect(await repository.getKdfSalt()).toBeNull();
  });

  it('returns null when KDF_SALT is the literal "undefined" string', async () => {
    // Regression: StorageManager used to coerce undefined to "undefined".
    // base64-decoding "undefined" produces a 6-byte buffer which would
    // trip libsodium's 16-byte salt requirement.
    mockGet.mockResolvedValue('undefined');
    expect(await repository.getKdfSalt()).toBeNull();
  });

  it('returns null when the decoded salt is not exactly 16 bytes', async () => {
    const eightBytesB64 = Buffer.from(new Uint8Array(8)).toString('base64');
    mockGet.mockResolvedValue(eightBytesB64);
    expect(await repository.getKdfSalt()).toBeNull();
  });

  it('returns the Uint8Array when the salt is exactly 16 bytes', async () => {
    const salt = new Uint8Array(16);
    salt.fill(7);
    mockGet.mockResolvedValue(Buffer.from(salt).toString('base64'));

    const result = await repository.getKdfSalt();

    expect(result).not.toBeNull();
    expect(result?.length).toBe(16);
    expect(Array.from(result as Uint8Array)).toEqual(Array.from(salt));
  });
});

describe('WalletRepository.deleteKdfSalt', () => {
  it('removes the KDF_SALT key from local storage', async () => {
    const mockRemove = jest.fn();
    const mockLocalStorage = {
      get: jest.fn(),
      set: jest.fn(),
      remove: mockRemove,
    } as unknown as StorageManager;
    const repository = new WalletRepository(
      mockLocalStorage,
      {} as unknown as StorageManager,
    );

    await repository.deleteKdfSalt();

    expect(mockRemove).toHaveBeenCalledWith('KDF_SALT');
  });
});
