import { StorageManager } from "@common/storage/storage-manager";

type LocalValueType = 'ADDRESS_BOOK';

export class WalletAddressRepository {

  private localStorage: StorageManager<LocalValueType>;

  constructor(localStorage: StorageManager) {
    this.localStorage = localStorage;
  }

  public getAddressBook = async () => {
    const addressBook = await this.localStorage.getToObject('ADDRESS_BOOK');
    return addressBook;
  };

  public updateAddressBooke = async (addressBook: { [key in string]: any }) => {
    await this.localStorage.setByObject('ADDRESS_BOOK', addressBook);
  };

  public deleteAddress = async () => {
    await this.localStorage.remove('ADDRESS_BOOK');
  }
}