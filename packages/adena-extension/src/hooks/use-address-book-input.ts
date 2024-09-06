import { useCallback, useEffect, useState } from 'react';
import { useAdenaContext, useWalletContext } from './use-context';
import { useCurrentAccount } from './use-current-account';
import { AddressBookItem } from '@repositories/wallet';
import { formatAddress, formatNickname } from '@common/utils/client-utils';
import { useNetwork } from './use-network';
import { addressValidationCheck } from '@common/utils/client-utils';
import { useAccountName } from './use-account-name';
import useDNSResolver from './use-dns';

export type UseAddressBookInputHookReturn = {
  opened: boolean;
  hasError: boolean;
  errorMessage: string;
  selected: boolean;
  selectedAddressBook: AddressBookItem | null;
  selectedName: string;
  selectedDescription: string;
  address: string;
  addressBookInfos: {
    addressBookId: string;
    name: string;
    description: string;
  }[];
  resultAddress: Promise<string>;
  setSelected: (selected: boolean) => void;
  setSelectedAddressBook: (selectedAddressBook: AddressBookItem | null) => void;
  setAddress: (address: string) => void;
  updateAddressBook: () => Promise<void>;
  onClickInputIcon: (selected: boolean) => void;
  onChangeAddress: (address: string) => void;
  onClickAddressBook: (addressBookId: string) => void;
  validateAddressBookInput: () => Promise<boolean>;
  validateEqualAddress: () => Promise<boolean>;
};

export const useAddressBookInput = (): UseAddressBookInputHookReturn => {
  const { addressBookService } = useAdenaContext();
  const { wallet } = useWalletContext();
  const { getCurrentAddress } = useCurrentAccount();
  const { currentNetwork } = useNetwork();
  const [opened, setOpened] = useState(false);
  const [selected, setSelected] = useState(false);
  const [selectedAddressBook, setSelectedAddressBook] = useState<AddressBookItem | null>(null);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [address, setAddress] = useState('');
  const [addressBooks, setAddressBooks] = useState<AddressBookItem[]>([]);
  const { accountNames } = useAccountName();
  const [addressBookInfos, setAddressBookInfos] = useState<
    {
      addressBookId: string;
      name: string;
      description: string;
    }[]
  >([]);
  const { resolveDomainToAddress, result } = useDNSResolver();

  const updateAddressBook = async (): Promise<void> => {
    const addressBooks = await addressBookService.getAddressBook();
    setAddressBooks(addressBooks);
  };

  const clearError = useCallback(() => {
    setHasError(false);
    setErrorMessage('Invalid address');
  }, []);

  const getAddressBookInfos = useCallback(async () => {
    const currentAccountInfos = [];
    const addressPrefix = currentNetwork?.addressPrefix || 'g';
    const currentAddress = await getCurrentAddress(addressPrefix);
    for (const account of wallet?.accounts || []) {
      const address = await account.getAddress(addressPrefix);
      if (address !== currentAddress) {
        currentAccountInfos.push({
          addressBookId: account.id,
          name: formatNickname(accountNames[account.id], 12),
          description: `(${formatAddress(address)})`,
        });
      }
    }
    const addressBookInfos = addressBooks
      .filter((addressBook) => addressBook.address !== currentAddress)
      .map((addressBook) => {
        return {
          addressBookId: addressBook.id,
          name: formatNickname(addressBook.name, 12),
          description: `(${formatAddress(addressBook.address)})`,
        };
      });

    return [...currentAccountInfos, ...addressBookInfos];
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

  const getResultAddress = useCallback(async () => {
    if (address.endsWith('.gno')) {
      const resolvedAddress = await resolveDomainToAddress(address);
      if (resolvedAddress)
        return resolvedAddress;
    }
    if (selected) {
      return selectedAddressBook?.address ?? '';
    }
    return address;
  }, [resolveDomainToAddress, selected, selectedAddressBook, address]);

  // useEffect(() => {
  //   const resolveAddress = async () => {
  //     if (address.endsWith('.gno')) {
  //       console.log(address)
  //       await resolveDomainToAddress(address);
  //       console.log(result?.address)
  //       setAddress(result?.address || address)
  //     }
  //   };
  //   resolveAddress();
  // }, [resolveDomainToAddress, getResultAddress, address, result]);

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

  const onChangeAddress = useCallback(
    (address: string) => {
      const regex = /^[a-zA-Z0-9.]*$/;
      if (!regex.test(address)) {
        return;
      }
      setAddress(address);
      if (hasError) {
        clearError();
      }
    },
    [hasError],
  );

  const onClickAddressBook = useCallback(
    async (addressBookId: string) => {
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
        const address = await selectedAccount.getAddress(currentNetwork?.addressPrefix || 'g');
        setSelectedAddressBook({
          id: selectedAccount.id,
          name: selectedAccount.name,
          address,
          createdAt: `${new Date().getTime()}`,
        });
        return;
      }
    },
    [addressBooks, wallet?.accounts],
  );

  const validateAddressBookInput = useCallback(async () => {
    const address = await getResultAddress();
    if (!addressValidationCheck(address)) {
      setHasError(true);
      setErrorMessage('Invalid Address');
      return false;
    }
    clearError();
    return true;
  }, [resolveDomainToAddress, result, selected, selectedAddressBook, address]);

  const validateEqualAddress = useCallback(async () => {
    const address = await getResultAddress();
    const currentAddress = await getCurrentAddress(currentNetwork?.addressPrefix);
    if (address === currentAddress) {
      setHasError(true);
      setErrorMessage('You can’t send GRC20 tokens to your own address');
      return false;
    }
    clearError();
    return true;
  }, [selected, selectedAddressBook, address]);

  useEffect(() => {
    getAddressBookInfos().then(setAddressBookInfos);
  }, [getAddressBookInfos]);

  return {
    opened,
    hasError,
    errorMessage,
    selected,
    selectedAddressBook,
    selectedName: getSelectedAddressBookInfos().name,
    selectedDescription: getSelectedAddressBookInfos().description,
    address,
    addressBookInfos,
    resultAddress: getResultAddress(),
    setSelected,
    setSelectedAddressBook,
    setAddress,
    updateAddressBook,
    onClickInputIcon,
    onChangeAddress,
    onClickAddressBook,
    validateAddressBookInput,
    validateEqualAddress,
  };
};
