import { Account } from 'adena-module';
import { AddressBookItem, WalletAddressRepository } from '@repositories/wallet';
import { v4 as uuidv4 } from 'uuid';

export class WalletAddressBookService {
  private walletAddressRepository: WalletAddressRepository;

  constructor(walletAddressRepository: WalletAddressRepository) {
    this.walletAddressRepository = walletAddressRepository;
  }

  public getAddressBookByAccountId = async (accountId: string) => {
    const addressBook = await this.walletAddressRepository.getAddressBook();
    const currentAddressBook = await this.selectAddressBookItemsBy(accountId, addressBook);
    return currentAddressBook;
  };

  public getAddressBookByAccounts = (accounts: Array<Account>): Array<AddressBookItem> => {
    return accounts.map((walletAccount) => {
      return {
        id: `${walletAccount.index}`,
        name: `${walletAccount.name}`,
        address: `${walletAccount.getAddress('g')}`,
        createdAt: `${new Date().getTime()}`,
      };
    });
  };

  public addAddressBookItemByAccountId = async (
    accountId: string,
    addressBookItem: {
      name: string;
      address: string;
    },
  ) => {
    const addressBook = await this.walletAddressRepository.getAddressBook();
    const accountAddressBook = await this.selectAddressBookItemsBy(accountId, addressBook);
    const changedaddressBook: { [key in string]: Array<AddressBookItem> } = {
      ...addressBook,
      [accountId]: [
        ...accountAddressBook,
        {
          id: uuidv4(),
          name: addressBookItem.name,
          address: addressBookItem.address,
          createdAt: `${new Date().getTime()}`,
        },
      ],
    };
    this.walletAddressRepository.updateAddressBooke(changedaddressBook);
  };

  public updateAddressBookItemById = async (
    accountId: string,
    addressBookItem: {
      id: string;
      name: string;
      address: string;
    },
  ) => {
    const addressBook = await this.walletAddressRepository.getAddressBook();
    const accountAddressBook = await this.selectAddressBookItemsBy(accountId, addressBook);

    const currentIndex = accountAddressBook.findIndex(
      (item: AddressBookItem) => item.id === addressBookItem.id,
    );
    if (currentIndex > -1) {
      accountAddressBook[currentIndex] = {
        ...accountAddressBook[currentIndex],
        name: addressBookItem.name,
        address: addressBookItem.address,
      };
    }

    // eslint-disable-next-line prefer-const
    const changedaddressBook = {
      ...addressBook,
      [accountId]: accountAddressBook,
    };
    this.walletAddressRepository.updateAddressBooke(changedaddressBook);
  };

  public removeAddressBookItemByAccountId = async (accountId: string, addressBookId: string) => {
    const addressBook = await this.walletAddressRepository.getAddressBook();
    const accountAddressBook = await this.selectAddressBookItemsBy(accountId, addressBook);

    const changedAccountAddressBook = accountAddressBook.filter(
      (item: AddressBookItem) => item.id !== addressBookId,
    );

    const changedaddressBook = {
      ...addressBook,
      [accountId]: changedAccountAddressBook,
    };
    this.walletAddressRepository.updateAddressBooke(changedaddressBook);
  };

  public clear = async () => {
    await this.walletAddressRepository.deleteAddress();
    return true;
  };

  private selectAddressBookItemsBy = async (
    accountId: string,
    addressBook: { [key in string]: Array<AddressBookItem> },
  ): Promise<Array<AddressBookItem>> => {
    const currentAddressBook =
      Object.keys(addressBook).findIndex((key) => key === accountId) > -1
        ? addressBook[accountId]
        : [];
    return currentAddressBook.map(({ id, name, address, createdAt }: AddressBookItem) => {
      return {
        id,
        name,
        address,
        createdAt,
      };
    });
  };
}
