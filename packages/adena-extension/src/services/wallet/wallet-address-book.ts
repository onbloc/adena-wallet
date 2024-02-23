import { AddressBookItem, WalletAddressRepository, WalletRepository } from '@repositories/wallet';
import { v4 as uuidv4 } from 'uuid';

export class WalletAddressBookService {
  private walletRepository: WalletRepository;

  private walletAddressRepository: WalletAddressRepository;

  constructor(
    walletRepository: WalletRepository,
    walletAddressRepository: WalletAddressRepository,
  ) {
    this.walletRepository = walletRepository;
    this.walletAddressRepository = walletAddressRepository;
  }

  public getAddressBook = async (): Promise<AddressBookItem[]> => {
    const password = await this.walletRepository.getWalletPassword();
    const addressBook = await this.walletAddressRepository.getAddressBook(password);
    return addressBook;
  };

  public addAddressBookItem = async (addressBookItem: {
    name: string;
    address: string;
  }): Promise<void> => {
    const password = await this.walletRepository.getWalletPassword();
    const addressBook = await this.walletAddressRepository.getAddressBook(password);
    await this.walletAddressRepository.updateAddressBook(
      [
        ...addressBook,
        {
          id: uuidv4(),
          name: addressBookItem.name,
          address: addressBookItem.address,
          createdAt: `${new Date().getTime()}`,
        },
      ],
      password,
    );
  };

  public updateAddressBookItemById = async (addressBookItem: {
    id: string;
    name: string;
    address: string;
  }): Promise<void> => {
    const password = await this.walletRepository.getWalletPassword();
    const addressBook = await this.walletAddressRepository.getAddressBook(password);
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
    await this.walletAddressRepository.updateAddressBook(changedAddressBook, password);
  };

  public removeAddressBookItemByAccountId = async (
    accountId: string,
    addressBookId: string,
  ): Promise<void> => {
    const password = await this.walletRepository.getWalletPassword();
    const addressBook = await this.walletAddressRepository.getAddressBook(password);

    const changedAddressBook = addressBook.filter(
      (item: AddressBookItem) => item.id !== addressBookId,
    );
    await this.walletAddressRepository.updateAddressBook(changedAddressBook, password);
  };

  public clear = async (): Promise<boolean> => {
    await this.walletAddressRepository.deleteAddress();
    return true;
  };
}
