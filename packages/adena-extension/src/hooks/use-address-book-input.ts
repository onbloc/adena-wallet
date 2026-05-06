import { validateCosmosAddress } from 'adena-module';
import { useCallback, useEffect, useState } from 'react';

import { inferChainGroup } from '@common/utils/address-chain';
import { formatAddress, formatNickname } from '@common/utils/client-utils';
import { AddressBookItem } from '@repositories/wallet';

import { useAccountName } from './use-account-name';
import { useChain } from './use-chain';
import { useAdenaContext, useWalletContext } from './use-context';
import { useCurrentAccount } from './use-current-account';

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
  resultAddress: string;
  setSelected: (selected: boolean) => void;
  setSelectedAddressBook: (selectedAddressBook: AddressBookItem | null) => void;
  setAddress: (address: string) => void;
  updateAddressBook: () => Promise<void>;
  onClickInputIcon: (selected: boolean) => void;
  onChangeAddress: (address: string) => void;
  onClickAddressBook: (addressBookId: string) => void;
  validateAddressBookInput: () => boolean;
  validateEqualAddress: () => Promise<boolean>;
};

export const useAddressBookInput = (chainGroup = 'gno'): UseAddressBookInputHookReturn => {
  const { addressBookService, chainRegistry } = useAdenaContext();
  const { wallet } = useWalletContext();
  const { getCurrentAddress } = useCurrentAccount();
  const chain = useChain(chainGroup);
  const addressPrefix = chain.bech32Prefix;
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
    const currentAddress = await getCurrentAddress(addressPrefix);
    for (const account of wallet?.accounts || []) {
      const address = await account.getAddress(addressPrefix);
      if (address !== currentAddress) {
        currentAccountInfos.push({
          addressBookId: account.id,
          name: formatNickname(accountNames[account.id] || account.name, 12),
          description: `(${formatAddress(address)})`,
        });
      }
    }
    const addressBookInfos = addressBooks
      .filter((addressBook) => addressBook.address !== currentAddress)
      .filter((addressBook) => inferChainGroup(addressBook.address, chainRegistry) === chainGroup)
      .map((addressBook) => {
        return {
          addressBookId: addressBook.id,
          name: formatNickname(addressBook.name, 12),
          description: `(${formatAddress(addressBook.address)})`,
        };
      });

    return [...currentAccountInfos, ...addressBookInfos];
  }, [addressBooks, wallet?.accounts, addressPrefix, chainGroup, accountNames]);

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

  const onChangeAddress = useCallback(
    (address: string) => {
      const regex = /^[a-zA-Z0-9]*$/;
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
        const address = await selectedAccount.getAddress(addressPrefix);
        setSelectedAddressBook({
          id: selectedAccount.id,
          name: accountNames[selectedAccount.id] || selectedAccount.name,
          address,
          createdAt: `${new Date().getTime()}`,
        });
        return;
      }
    },
    [addressBooks, wallet?.accounts, addressPrefix, accountNames],
  );

  const validateAddressBookInput = useCallback(() => {
    const address = getResultAddress();
    if (!validateCosmosAddress(address, addressPrefix)) {
      setHasError(true);
      setErrorMessage('Invalid Address');
      return false;
    }
    clearError();
    return true;
  }, [selected, selectedAddressBook, address, addressPrefix]);

  const validateEqualAddress = useCallback(async () => {
    const address = getResultAddress();
    const currentAddress = await getCurrentAddress(addressPrefix);
    if (address === currentAddress) {
      setHasError(true);
      setErrorMessage('You can’t send GRC20 tokens to your own address');
      return false;
    }
    clearError();
    return true;
  }, [selected, selectedAddressBook, address, addressPrefix]);

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
