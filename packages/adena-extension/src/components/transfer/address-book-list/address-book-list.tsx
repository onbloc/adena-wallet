import React from 'react';
import { AddressBookListWrapper, AddressBookListItemWrapper } from './address-book-list.styles';

export interface AddressBookListProps {
  addressBookInfos: {
    addressBookId: string;
    name: string;
    description: string;
  }[];
  onClickItem: (addressBookId: string) => void;
}

interface AddressBookListItemProps {
  addressBookId: string;
  name: string;
  address: string;
  onClickItem: (addressBookId: string) => void;
}

const AddressBookListItem: React.FC<AddressBookListItemProps> = ({
  addressBookId,
  name,
  address,
  onClickItem
}) => {
  return (
    <AddressBookListItemWrapper onClick={() => onClickItem(addressBookId)}>
      <div className='name'>{name}</div>
      <div className='address'>{address}</div>
    </AddressBookListItemWrapper>
  );
};

const AddressBookList: React.FC<AddressBookListProps> = ({
  addressBookInfos,
  onClickItem,
}) => {
  return (
    <AddressBookListWrapper>
      {addressBookInfos.map((info, index) =>
        <AddressBookListItem
          key={index}
          addressBookId={info.addressBookId}
          address={info.description}
          name={info.name}
          onClickItem={onClickItem}
        />
      )}
    </AddressBookListWrapper>
  );
};

export default AddressBookList;