import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { ReactElement, useState } from 'react';

import { AddressBookEditPage } from '../../../components/pages';
import { toErrorMessage } from '../../../core/error-message';
import { AppErrorCode, isAppError } from '../../../core/errors';
import { useContainer } from '../../../di/container-provider';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainStackParamList } from '../../../navigation/types';
import { useSessionStore } from '../../../stores/session.store';

export const AddressBookEditScreen = ({ navigation, route }: NativeStackScreenProps<MainStackParamList, 'AddressBookEdit'>): ReactElement => {
  const entry = route.params?.entry;
  const { addressBookService } = useContainer();
  const { network } = useWalletSnapshot();
  const bumpRevision = useSessionStore(state => state.bumpRevision);
  const [name, setName] = useState(entry?.name ?? '');
  const [address, setAddress] = useState(entry?.address ?? '');
  const [nameError, setNameError] = useState<string>();
  const [addressError, setAddressError] = useState<string>();

  const handleChangeName = (value: string): void => {
    setName(value);
    setNameError(undefined);
  };

  const handleChangeAddress = (value: string): void => {
    setAddress(value);
    setAddressError(undefined);
  };

  const handleSave = (): void => {
    try {
      if (entry) {
        addressBookService.update(entry.id, { name, address }, network);
      }
      else {
        addressBookService.add({ name, address }, network);
      }

      bumpRevision();
      navigation.goBack();
    }
    catch (error) {
      const message = toErrorMessage(error);

      if (isAppError(error, AppErrorCode.INVALID_ADDRESS) || /address/i.test(message)) {
        setAddressError(message);
      }
      else {
        setNameError(message);
      }
    }
  };

  return (
    <AddressBookEditPage
      mode={entry ? 'edit' : 'add'}
      name={name}
      address={address}
      onChangeName={handleChangeName}
      onChangeAddress={handleChangeAddress}
      nameError={nameError}
      addressError={addressError}
      addressPlaceholder={`${network.addressPrefix}1…`}
      onSave={handleSave}
      onRemove={entry
        ? (): void => {
            addressBookService.remove(entry.id);
            bumpRevision();
            navigation.goBack();
          }
        : undefined}
      onBack={navigation.goBack}
    />
  );
};
