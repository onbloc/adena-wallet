import { StorageManager } from '@common/storage/storage-manager';

type LocalValueType = 'ADDRESS_BOOK';

export interface AddressBookItem {
  id: string;
  name: string;
  address: string;
  createdAt: string;
}

export class WalletAddressRepository {
  private localStorage: StorageManager<LocalValueType>;

  constructor(localStorage: StorageManager) {
    this.localStorage = localStorage;
  }

  public getAddressBook = async (): Promise<AddressBookItem[]> => {
    const addressBook = await this.localStorage.getToObject('ADDRESS_BOOK');
    if (!Array.isArray(addressBook)) {
      return [];
    }
    return addressBook as AddressBookItem[];
  };

  public updateAddressBooke = async (addressBook: AddressBookItem[]): Promise<void> => {
    await this.localStorage.setByObject('ADDRESS_BOOK', addressBook);
  };

  public deleteAddress = async (): Promise<void> => {
    await this.localStorage.remove('ADDRESS_BOOK');
  };
}
