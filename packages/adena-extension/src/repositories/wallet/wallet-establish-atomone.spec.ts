import { StorageManager } from '@common/storage/storage-manager';
import { EstablishSite } from './wallet-establish';
import { WalletEstablishAtomOneRepository } from './wallet-establish-atomone';

describe('WalletEstablishAtomOneRepository', () => {
  let repository: WalletEstablishAtomOneRepository;
  let mockGetToObject: jest.Mock;
  let mockSetByObject: jest.Mock;
  let mockRemove: jest.Mock;

  beforeEach(() => {
    mockGetToObject = jest.fn();
    mockSetByObject = jest.fn();
    mockRemove = jest.fn();
    const mockStorage = {
      getToObject: mockGetToObject,
      setByObject: mockSetByObject,
      remove: mockRemove,
    } as unknown as StorageManager;
    repository = new WalletEstablishAtomOneRepository(mockStorage);
  });

  describe('getEstablishedSites', () => {
    it('reads from ESTABLISH_ATOMONE_SITES key and returns stored value', async () => {
      const stored: { [key: string]: EstablishSite[] } = {
        'account-a': [
          {
            hostname: 'https://dapp.example',
            chainId: 'atomone-1',
            account: 'account-a',
            name: 'Example',
            favicon: null,
            establishedTime: '1700000000000',
          },
        ],
      };
      mockGetToObject.mockResolvedValue(stored);

      const result = await repository.getEstablishedSites();

      expect(mockGetToObject).toHaveBeenCalledWith('ESTABLISH_ATOMONE_SITES');
      expect(result).toEqual(stored);
    });

    it('returns empty object when storage has no value', async () => {
      mockGetToObject.mockResolvedValue(undefined);

      const result = await repository.getEstablishedSites();

      expect(result).toEqual({});
    });
  });

  describe('updateEstablishedSites', () => {
    it('writes to ESTABLISH_ATOMONE_SITES key', async () => {
      const value: { [key: string]: EstablishSite[] } = { 'account-a': [] };

      await repository.updateEstablishedSites(value);

      expect(mockSetByObject).toHaveBeenCalledWith('ESTABLISH_ATOMONE_SITES', value);
    });
  });

  describe('deleteEstablishedSites', () => {
    it('removes the ESTABLISH_ATOMONE_SITES key', async () => {
      await repository.deleteEstablishedSites();

      expect(mockRemove).toHaveBeenCalledWith('ESTABLISH_ATOMONE_SITES');
    });
  });
});
