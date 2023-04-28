import { useCallback, useState } from 'react';
import { useAdenaContext, useWalletContext } from './use-context';
import { useCurrentAccount } from './use-current-account';
import { AddressBookItem } from '@repositories/wallet';
import { formatAddress, formatNickname } from '@common/utils/client-utils';
import { useNetwork } from './use-network';
import { addressValidationCheck } from '@common/utils/client-utils';

export const useAddressBookInput = () => {
  const { addressBookService } = useAdenaContext();
  const { wallet } = useWalletContext();
  const { currentAccount } = useCurrentAccount();
  const { currentNetwork } = useNetwork();
  const [opened, setOpened] = useState(false);
  const [selected, setSelected] = useState(false);
  const [selectedAddressBook, setSelectedAddressBook] = useState<AddressBookItem | null>(null);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [address, setAddress] = useState('');
  const [addressBooks, setAddressBooks] = useState<AddressBookItem[]>([]);

  const updateAddressBook = async () => {
    if (!currentAccount) {
      return;
    }
    const addressBooks = await addressBookService.getAddressBookByAccountId(currentAccount.id);
    setAddressBooks(addressBooks);
  };

  const clearError = useCallback(() => {
    setHasError(false);
    setErrorMessage('Invalid address');
  }, []);

  const getAddressBookInfos = useCallback(() => {
    const currenAccountInfos =
      wallet?.accounts.map((account) => {
        return {
          addressBookId: account.id,
          name: formatNickname(account.name, 12),
          description: `(${formatAddress(
            account.getAddress(currentNetwork?.addressPrefix || 'g'),
          )})`,
        };
      }) ?? [];
    const addressBookInfos = addressBooks.map((addressBook) => {
      return {
        addressBookId: addressBook.id,
        name: formatNickname(addressBook.name, 12),
        description: `(${formatAddress(addressBook.address)})`,
      };
    });

    return [...currenAccountInfos, ...addressBookInfos];
  }, [addressBooks, wallet?.accounts]);

  const getSelectedAddressBookInfos = useCallback(() => {
    if (selectedAddressBook === null) {
      return {
        name: '',
        description: '',
      };
    }
    return {
      name: formatNickname(selectedAddressBook.name, 12),
      description: `(${formatAddress(selectedAddressBook.address)})`,
    };
  }, [selectedAddressBook]);

  const getResultAddress = useCallback(() => {
    if (selected) {
      return selectedAddressBook?.address ?? '';
    }
    return address;
  }, [selected, selectedAddressBook, address]);

  const onClickInputIcon = useCallback(
    (selected: boolean) => {
      if (selected === false) {
        setSelected(false);
        setAddress('');
        setSelectedAddressBook(null);
        setOpened(false);
      } else {
        setOpened(!opened);
      }
    },
    [opened],
  );

  const onChangeAddress = useCallback((address: string) => {
    setAddress(address);
    if (hasError) {
      clearError();
    }
  }, []);

  const onClickAddressBook = useCallback(
    (addressBookId: string) => {
      const selectedAddressBook = addressBooks.find(
        (addressBook) => addressBook.id === addressBookId,
      );
      if (selectedAddressBook) {
        clearError();
        setOpened(false);
        setSelected(true);
        setSelectedAddressBook(selectedAddressBook);
        return;
      }
      const selectedAccount = wallet?.accounts.find((account) => account.id === addressBookId);
      if (selectedAccount) {
        clearError();
        setOpened(false);
        setSelected(true);
        setSelectedAddressBook({
          id: selectedAccount.id,
          name: selectedAccount.name,
          address: selectedAccount.getAddress(currentNetwork?.addressPrefix || 'g'),
          createdAt: `${new Date().getTime()}`,
        });
        return;
      }
    },
    [addressBooks, wallet?.accounts],
  );

  const validateAddressBookInput = useCallback(() => {
    const address = getResultAddress();
    if (!addressValidationCheck(address)) {
      setHasError(true);
      setErrorMessage('Invalid Address');
      return false;
    }
    clearError();
    return true;
  }, [selected, selectedAddressBook, address]);

  return {
    opened,
    hasError,
    errorMessage,
    selected,
    selectedName: getSelectedAddressBookInfos().name,
    selectedDescription: getSelectedAddressBookInfos().description,
    address,
    addressBookInfos: getAddressBookInfos(),
    resultAddress: getResultAddress(),
    updateAddressBook,
    onClickInputIcon,
    onChangeAddress,
    onClickAddressBook,
    validateAddressBookInput,
  };
};