import React, { ReactElement } from 'react';

import { formatAddress } from '../../../utils/address';
import { Avatar, Button } from '../../atoms';
import { EmptyState, ListRow, Screen, TopBar } from '../../molecules';

export interface AddressBookItemView {
  id: string;
  name: string;
  address: string;
}

export interface AddressBookPageProps {
  entries: AddressBookItemView[];
  onAdd: () => void;
  onEdit: (id: string) => void;
  onBack: () => void;
}

export const AddressBookPage = ({ entries, onAdd, onEdit, onBack }: AddressBookPageProps): ReactElement => (
  <Screen
    header={<TopBar title='Address book' onBack={onBack} />}
    footer={<Button label='Add address' leadingIcon='plus' onPress={onAdd} testID='address-book-add' />}
  >
    {entries.length === 0 && <EmptyState title='No saved addresses' description='Save addresses you send to often.' />}
    {entries.map((entry) => {
      const handlePress = (): void => onEdit(entry.id);

      return (
        <ListRow
          key={entry.id}
          leading={<Avatar name={entry.name} />}
          label={entry.name}
          description={formatAddress(entry.address)}
          onPress={handlePress}
        />
      );
    })}
  </Screen>
);
