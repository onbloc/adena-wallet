import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement } from 'react';

import { AddressBookPage } from '../../../components/pages';
import { useContainer } from '../../../di/container-provider';
import { MainStackParamList } from '../../../navigation/types';
import { useSessionStore } from '../../../stores/session.store';

export const AddressBookScreen = ({ navigation }: NativeStackScreenProps<MainStackParamList, 'AddressBook'>): ReactElement => {
  const { addressBookService } = useContainer();

  useSessionStore(state => state.revision);
  const entries = addressBookService.getEntries();

  const handleAdd = (): void => navigation.navigate('AddressBookEdit');

  const handleEdit = (id: string): void => navigation.navigate('AddressBookEdit', { entry: entries.find(entry => entry.id === id) });

  return (
    <AddressBookPage
      entries={entries.map(entry => ({ id: entry.id, name: entry.name, address: entry.address }))}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onBack={navigation.goBack}
    />
  );
};
