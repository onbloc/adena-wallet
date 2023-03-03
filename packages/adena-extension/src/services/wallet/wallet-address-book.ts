import { WalletAccount } from 'adena-module';
import { WalletAccountRepository, WalletAddressRepository } from '@repositories/wallet';
import { v4 as uuidv4 } from 'uuid';

interface AddressBookItem {
  id: string;
  name: string;
  address: string;
  createdAt: string;
}

export class WalletAddressBookService {

  private walletAccountRepository: WalletAccountRepository;

  private walletAddressRepository: WalletAddressRepository;

  constructor(walletAccountRepository: WalletAccountRepository, walletAddressRepository: WalletAddressRepository) {
    this.walletAccountRepository = walletAccountRepository;
    this.walletAddressRepository = walletAddressRepository;
  }

  public getAddressBook = async () => {
    const addressBook = await this.walletAddressRepository.getAddressBook();
    const currentAccountAddress = await this.walletAccountRepository.getCurrentAccountAddress();
    const currentAccountAddressBook = await this.getAddressBookItems(addressBook, currentAccountAddress);
    return currentAccountAddressBook;
  };

  public getAddressBookByWalletAccounts = (
    walletAccounts: Array<InstanceType<typeof WalletAccount>>,
  ): Array<AddressBookItem> => {
    return walletAccounts.map((walletAccount) => {
      return {
        id: `${walletAccount.data.index}`,
        name: `${walletAccount.data.name}`,
        address: `${walletAccount.data.address}`,
        createdAt: `${new Date().getTime()}`,
      };
    });
  };

  public addAddressBookItem = async (name: string, address: string) => {
    const addressBook = await this.walletAddressRepository.getAddressBook();
    const currentAccountAddress = await this.walletAccountRepository.getCurrentAccountAddress();
    const accountAddressBook = await this.getAddressBookItems(addressBook, currentAccountAddress);
    const changedaddressBook: { [key in string]: Array<AddressBookItem> } = {
      ...addressBook,
      [currentAccountAddress]: [
        ...accountAddressBook,
        {
          id: uuidv4(),
          name,
          address,
          createdAt: `${new Date().getTime()}`,
        },
      ],
    };
    this.walletAddressRepository.updateAddressBooke(changedaddressBook);
  };

  public updateAddressBookItem = async (id: string, name: string, address: string) => {
    const addressBook = await this.walletAddressRepository.getAddressBook();
    const currentAccountAddress = await this.walletAccountRepository.getCurrentAccountAddress();
    const accountAddressBook = await this.getAddressBookItems(addressBook, currentAccountAddress);

    const currentIndex = accountAddressBook.findIndex((item: AddressBookItem) => item.id === id);
    if (currentIndex > -1) {
      accountAddressBook[currentIndex] = {
        ...accountAddressBook[currentIndex],
        name,
        address,
      };
    }

    // eslint-disable-next-line prefer-const
    const changedaddressBook = {
      ...addressBook,
      [currentAccountAddress]: accountAddressBook,
    };
    this.walletAddressRepository.updateAddressBooke(changedaddressBook);
  };

  public removeAddressBookItem = async (id: string) => {
    const addressBook = await this.walletAddressRepository.getAddressBook();
    const currentAccountAddress = await this.walletAccountRepository.getCurrentAccountAddress();
    const accountAddressBook = await this.getAddressBookItems(addressBook, currentAccountAddress);

    const changedAccountAddressBook = accountAddressBook.filter((item: AddressBookItem) => item.id !== id);

    // eslint-disable-next-line prefer-const
    let changedaddressBook = {
      ...addressBook,
      [currentAccountAddress]: changedAccountAddressBook,
    };
    this.walletAddressRepository.updateAddressBooke(changedaddressBook);
  };

  private getAddressBookItems = async (
    addressBook: { [key in string]: Array<AddressBookItem> },
    currentAccountAddress: string,
  ): Promise<Array<AddressBookItem>> => {
    const currentAccountAddressBook =
      Object.keys(addressBook).findIndex((key) => key === currentAccountAddress) > -1
        ? addressBook[currentAccountAddress]
        : [];
    return currentAccountAddressBook.map((item: AddressBookItem) => {
      return {
        id: item.id,
        name: item.name,
        address: item.address,
        createdAt: item.createdAt,
      };
    });
  };
}

