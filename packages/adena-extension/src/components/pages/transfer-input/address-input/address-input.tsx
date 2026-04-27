import CancelIcon from '@assets/cancel-small.svg';
import TransferAddressBookIcon from '@assets/transfer-address-book.svg';
import AddressBookList from '@components/pages/transfer-input/address-book-list/address-book-list';
import React, { useEffect, useRef } from 'react';
import { AddressInputWrapper } from './address-input.styles';

export interface AddressInputProps {
  opened: boolean;
  hasError: boolean;
  selected: boolean;
  selectedName: string;
  selectedDescription: string;
  address: string;
  errorMessage?: string;
  addressBookInfos: {
    addressBookId: string;
    name: string;
    description: string;
  }[];
  onClickInputIcon: (selected: boolean) => void;
  onChangeAddress: (address: string) => void;
  onClickAddressBook: (addressBookId: string) => void;
  // Cosmos atone1 addresses are 44 chars vs Gno g1 addresses at 40.
  // Leaving these optional preserves the Gno-only behavior for existing callers.
  maxLength?: number;
  placeholder?: string;
}

const AddressInput: React.FC<AddressInputProps> = ({
  opened,
  hasError,
  selected,
  selectedName,
  selectedDescription,
  address,
  addressBookInfos,
  errorMessage,
  onClickInputIcon,
  onChangeAddress,
  onClickAddressBook,
  maxLength = 40,
  placeholder = 'Recipient’s Gno.land Address',
}) => {
  const addressInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (addressInputRef.current) {
      addressInputRef.current.style.height = 'auto';
      addressInputRef.current.style.height = `${addressInputRef.current.scrollHeight}px`;
    }
  }, [address]);

  return (
    <AddressInputWrapper className={`${hasError ? 'error' : ''} ${opened ? 'opened' : ''}`}>
      <div className='input-wrapper'>
        {selected ? (
          <div className='selected-title-wrapper'>
            <span className='name'>{selectedName}</span>
            <span className='description'>{selectedDescription}</span>
          </div>
        ) : (
          <textarea
            ref={addressInputRef}
            className='address-input'
            value={address}
            onChange={(event): void => onChangeAddress(event.target.value)}
            placeholder={placeholder}
            autoComplete='off'
            maxLength={maxLength}
            rows={1}
          />
        )}

        <div
          className='address-book-icon-wrapper'
          onClick={(): void => onClickInputIcon(!selected)}
        >
          <img
            className='address-book'
            src={selected ? CancelIcon : TransferAddressBookIcon}
            alt='search icon'
          />
        </div>
      </div>

      <div className='list-container'>
        {opened && (
          <div className='list-wrapper'>
            <AddressBookList addressBookInfos={addressBookInfos} onClickItem={onClickAddressBook} />
          </div>
        )}
      </div>

      {hasError && <span className='error-message'>{errorMessage}</span>}
    </AddressInputWrapper>
  );
};

export default AddressInput;
