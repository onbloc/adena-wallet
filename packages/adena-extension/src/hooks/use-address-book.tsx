import { useRecoilState } from 'recoil';

import { useAdenaContext } from './use-context';
import { WalletState } from '@states';
import { useCurrentAccount } from './use-current-account';
import { AddressBookItem } from '@repositories/wallet';

export type UseAddressBookReturn = {
  addressBook: AddressBookItem[];
  loading: boolean;
  initAddressBook: () => Promise<boolean>;
  addAddressBookItem: (name: string, address: string) => Promise<boolean>;
  editAddressBookItem: (id: string, name: string, address: string) => Promise<boolean>;
  removeAddressBookItem: (id: string) => Promise<boolean>;
};

export const useAddressBook = (): UseAddressBookReturn => {
  const { addressBookService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const [addressBook, setAddressBook] = useRecoilState(WalletState.addressBook);

  const addAddressBookItem = async (name: string, address: string): Promise<boolean> => {
    return _update(() =>
      addressBookService
        .addAddressBookItem({ name, address })
        .then(() => true)
        .catch(() => false),
    );
  };

  const editAddressBookItem = async (
    id: string,
    name: string,
    address: string,
  ): Promise<boolean> => {
    return _update(() =>
      addressBookService
        .updateAddressBookItemById({
          id,
          name,
          address,
        })
        .then(() => true)
        .catch(() => false),
    );
  };

  const removeAddressBookItem = async (id: string): Promise<boolean> => {
    return _update(() =>
      addressBookService
        .removeAddressBookItemByAccountId(currentAccount?.id || '', id)
        .then(() => true)
        .catch(() => false),
    );
  };

  const initAddressBook = async (): Promise<boolean> => {
    return _update();
  };

  const _update = async (callback?: () => Promise<boolean>): Promise<boolean> => {
    setAddressBook((prev) => ({
      ...prev,
      loading: true,
    }));
    const result = callback ? await callback() : true;
    const addressBookItems = await addressBookService.getAddressBook();
    setAddressBook({
      init: true,
      loading: false,
      items: addressBookItems,
    });
    return result;
  };

  return {
    addressBook: addressBook.items,
    loading: addressBook.loading,
    initAddressBook,
    addAddressBookItem,
    editAddressBookItem,
    removeAddressBookItem,
  };
};
