import React from 'react';
import { AddressBookListWrapper, AddressBookListItemWrapper } from './address-book-list.styles';
import Text from '@components/text';
import theme from '@styles/theme';

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
  onClickItem,
}) => {
  return (
    <AddressBookListItemWrapper onClick={(): void => onClickItem(addressBookId)}>
      <div className='name'>{name}</div>
      <div className='address'>{address}</div>
    </AddressBookListItemWrapper>
  );
};

const AddressBookList: React.FC<AddressBookListProps> = ({ addressBookInfos, onClickItem }) => {
  return (
    <AddressBookListWrapper>
      {addressBookInfos.length === 0 && (
        <div className='no-address-wrapper'>
          <Text className='no-address' type='body2Reg' color={theme.color.neutral[9]}>
            No address registered
          </Text>
        </div>
      )}
      {addressBookInfos.map((info, index) => (
        <AddressBookListItem
          key={index}
          addressBookId={info.addressBookId}
          address={info.description}
          name={info.name}
          onClickItem={onClickItem}
        />
      ))}
    </AddressBookListWrapper>
  );
};

export default AddressBookList;
