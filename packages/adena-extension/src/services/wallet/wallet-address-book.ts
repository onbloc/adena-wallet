import { WalletAccount } from 'adena-module';
import { WalletAccountRepository, WalletAddressRepository } from '@repositories/wallet';
import { v4 as uuidv4 } from 'uuid';

export const getAddressBook = async () => {
  const addressBook = await WalletAddressRepository.getAddressBook();
  const currentAccountAddress = await WalletAccountRepository.getCurrentAccountAddress();
  const currentAccountAddressBook = await getAddressBookItems(addressBook, currentAccountAddress);
  return currentAccountAddressBook;
};

export const getAddressBookByWalletAccounts = (
  walletAccounts: Array<InstanceType<typeof WalletAccount>>,
) => {
  return walletAccounts.map((walletAccount) => {
    return {
      id: `${walletAccount.data.index}`,
      name: `${walletAccount.data.name}`,
      address: `${walletAccount.data.address}`,
      createdAt: new Date().getTime(),
    };
  });
};

export const addAddressBookItem = async (name: string, address: string) => {
  const addressBook = await WalletAddressRepository.getAddressBook();
  const currentAccountAddress = await WalletAccountRepository.getCurrentAccountAddress();
  const accountAddressBook = await getAddressBookItems(addressBook, currentAccountAddress);
  const changedaddressBook: { [key in string]: any } = {
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
  WalletAddressRepository.updateAddressBooke(changedaddressBook);
};

export const updateAddressBookItem = async (id: string, name: string, address: string) => {
  const addressBook = await WalletAddressRepository.getAddressBook();
  const currentAccountAddress = await WalletAccountRepository.getCurrentAccountAddress();
  const accountAddressBook = await getAddressBookItems(addressBook, currentAccountAddress);

  const currentIndex = accountAddressBook.findIndex((item: any) => item.id === id);
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
  WalletAddressRepository.updateAddressBooke(changedaddressBook);
};

export const removeAddressBookItem = async (id: string) => {
  const addressBook = await WalletAddressRepository.getAddressBook();
  const currentAccountAddress = await WalletAccountRepository.getCurrentAccountAddress();
  const accountAddressBook = await getAddressBookItems(addressBook, currentAccountAddress);

  const changedAccountAddressBook = accountAddressBook.filter((item: any) => item.id !== id);

  // eslint-disable-next-line prefer-const
  let changedaddressBook = {
    ...addressBook,
    [currentAccountAddress]: changedAccountAddressBook,
  };
  WalletAddressRepository.updateAddressBooke(changedaddressBook);
};

const getAddressBookItems = async (
  addressBook: { [key in string]: any },
  currentAccountAddress: string,
): Promise<
  Array<{
    id: string;
    name: string;
    address: string;
    createdAt: string;
  }>
> => {
  const currentAccountAddressBook =
    Object.keys(addressBook).findIndex((key) => key === currentAccountAddress) > -1
      ? addressBook[currentAccountAddress]
      : [];
  return currentAccountAddressBook.map((item: any) => {
    return {
      id: item.id,
      name: item.name,
      address: item.address,
      createdAt: item.createdAt,
    };
  });
};
