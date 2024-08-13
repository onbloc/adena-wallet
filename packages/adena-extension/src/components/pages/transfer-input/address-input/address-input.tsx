import React, { useEffect, useRef } from 'react';
import { AddressInputWrapper } from './address-input.styles';
import TransferAddressBookIcon from '@assets/transfer-address-book.svg';
import CancelIcon from '@assets/cancel-small.svg';
import AddressBookList from '@components/pages/transfer-input/address-book-list/address-book-list';

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
            placeholder='Recipient’s Name Or Address'
            autoComplete='off'
            maxLength={40}
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
