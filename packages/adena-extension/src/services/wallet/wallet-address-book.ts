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

  private getPasswordAndSalt = async (): Promise<{ password: string; salt: Uint8Array }> => {
    const password = await this.walletRepository.getWalletPassword();
    const salt = await this.walletRepository.getKdfSalt();
    if (!salt) {
      throw new Error('KDF salt not found');
    }
    return { password, salt };
  };

  public getAddressBook = async (): Promise<AddressBookItem[]> => {
    const { password, salt } = await this.getPasswordAndSalt();
    const addressBook = await this.walletAddressRepository.getAddressBook(password, salt);
    return addressBook;
  };

  public addAddressBookItem = async (addressBookItem: {
    name: string;
    address: string;
  }): Promise<void> => {
    const { password, salt } = await this.getPasswordAndSalt();
    const addressBook = await this.walletAddressRepository.getAddressBook(password, salt);
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
      salt,
    );
  };

  public updateAddressBookItemById = async (addressBookItem: {
    id: string;
    name: string;
    address: string;
  }): Promise<void> => {
    const { password, salt } = await this.getPasswordAndSalt();
    const addressBook = await this.walletAddressRepository.getAddressBook(password, salt);
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
    await this.walletAddressRepository.updateAddressBook(changedAddressBook, password, salt);
  };

  public removeAddressBookItemByAccountId = async (
    accountId: string,
    addressBookId: string,
  ): Promise<void> => {
    const { password, salt } = await this.getPasswordAndSalt();
    const addressBook = await this.walletAddressRepository.getAddressBook(password, salt);

    const changedAddressBook = addressBook.filter(
      (item: AddressBookItem) => item.id !== addressBookId,
    );
    await this.walletAddressRepository.updateAddressBook(changedAddressBook, password, salt);
  };

  public clear = async (): Promise<boolean> => {
    await this.walletAddressRepository.deleteAddress();
    return true;
  };
}
