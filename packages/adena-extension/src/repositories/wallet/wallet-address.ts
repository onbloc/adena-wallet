import { StorageManager } from '@common/storage/storage-manager';
import {
  decryptXChacha20,
  EncryptedData,
  encryptXChacha20,
} from 'adena-module';

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

  public getAddressBook = async (
    password: string,
    salt: Uint8Array,
  ): Promise<AddressBookItem[]> => {
    const encryptedAddressBook = await this.localStorage.get('ADDRESS_BOOK');
    if (!encryptedAddressBook) {
      return [];
    }

    try {
      const encryptedData: EncryptedData = JSON.parse(encryptedAddressBook);
      const addressBookRaw = await decryptXChacha20(encryptedData, password, salt);
      return JSON.parse(addressBookRaw) as AddressBookItem[];
    } catch {
      return [];
    }
  };

  public updateAddressBook = async (
    addressBook: AddressBookItem[],
    password: string,
    salt: Uint8Array,
  ): Promise<void> => {
    const addressBookRaw = JSON.stringify(addressBook);
    const encrypted = await encryptXChacha20(addressBookRaw, password, salt);

    await this.localStorage.set('ADDRESS_BOOK', JSON.stringify(encrypted));
  };

  public deleteAddress = async (): Promise<void> => {
    await this.localStorage.remove('ADDRESS_BOOK');
  };
}
