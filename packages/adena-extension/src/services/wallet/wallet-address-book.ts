import { AddressBookItem, WalletAddressRepository } from '@repositories/wallet';
import { v4 as uuidv4 } from 'uuid';

export class WalletAddressBookService {
  private walletAddressRepository: WalletAddressRepository;

  constructor(walletAddressRepository: WalletAddressRepository) {
    this.walletAddressRepository = walletAddressRepository;
  }

  public getAddressBook = async (): Promise<AddressBookItem[]> => {
    const addressBook = await this.walletAddressRepository.getAddressBook();
    return addressBook;
  };

  public addAddressBookItem = async (addressBookItem: {
    name: string;
    address: string;
  }): Promise<void> => {
    const addressBook = await this.walletAddressRepository.getAddressBook();
    await this.walletAddressRepository.updateAddressBooke([
      ...addressBook,
      {
        id: uuidv4(),
        name: addressBookItem.name,
        address: addressBookItem.address,
        createdAt: `${new Date().getTime()}`,
      },
    ]);
  };

  public updateAddressBookItemById = async (addressBookItem: {
    id: string;
    name: string;
    address: string;
  }): Promise<void> => {
    const addressBook = await this.walletAddressRepository.getAddressBook();
    const changedAddressBook = addressBook.map((item) => {
      if (item.id === addressBookItem.id) {
        return {
          ...item,
          name: addressBookItem.name,
          address: addressBookItem.address,
        };
      }
      return item;
    });
    await this.walletAddressRepository.updateAddressBooke(changedAddressBook);
  };

  public removeAddressBookItemByAccountId = async (
    accountId: string,
    addressBookId: string,
  ): Promise<void> => {
    const addressBook = await this.walletAddressRepository.getAddressBook();

    const changedAddressBook = addressBook.filter(
      (item: AddressBookItem) => item.id !== addressBookId,
    );
    await this.walletAddressRepository.updateAddressBooke(changedAddressBook);
  };

  public clear = async (): Promise<boolean> => {
    await this.walletAddressRepository.deleteAddress();
    return true;
  };
}
