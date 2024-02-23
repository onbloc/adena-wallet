import { StorageManager } from '@common/storage/storage-manager';
import { decryptAES, encryptAES } from 'adena-module';

type LocalValueType = 'ADDRESS_BOOK' | 'ENCRYPTED_STORED_PASSWORD';

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

  public getAddressBook = async (password: string): Promise<AddressBookItem[]> => {
    const encryptedAddressBook = await this.localStorage.get('ADDRESS_BOOK');
    if (!encryptedAddressBook) {
      return [];
    }
    const addressBookRaw = await decryptAES(encryptedAddressBook, password);

    try {
      return JSON.parse(addressBookRaw) as AddressBookItem[];
    } catch {
      return [];
    }
  };

  public updateAddressBook = async (
    addressBook: AddressBookItem[],
    password: string,
  ): Promise<void> => {
    const addressBookRaw = JSON.stringify(addressBook);
    const encryptedAddressBook = await encryptAES(addressBookRaw, password);

    await this.localStorage.set('ADDRESS_BOOK', encryptedAddressBook);
  };

  public deleteAddress = async (): Promise<void> => {
    await this.localStorage.remove('ADDRESS_BOOK');
  };
}
