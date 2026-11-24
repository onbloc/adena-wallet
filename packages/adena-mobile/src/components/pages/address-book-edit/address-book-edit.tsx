import React, { ReactElement, useRef } from 'react';
import { TextInputInstance } from 'react-native';

import { Button } from '../../atoms';
import { Screen, TextField, TopBar } from '../../molecules';

export interface AddressBookEditPageProps {
  mode: 'add' | 'edit';
  name: string;
  address: string;
  onChangeName: (value: string) => void;
  onChangeAddress: (value: string) => void;
  nameError?: string;
  addressError?: string;
  addressPlaceholder: string;
  onSave: () => void;
  onRemove?: () => void;
  onBack: () => void;
}

export const AddressBookEditPage = (props: AddressBookEditPageProps): ReactElement => {
  const addressRef = useRef<TextInputInstance>(null);

  const handleSubmitEditing = (): void => {
    if (props.name.trim() && props.address.trim()) {
      props.onSave();
    }
  };

  return (
    <Screen
      header={<TopBar title={props.mode === 'add' ? 'Add address' : 'Edit address'} onBack={props.onBack} />}
      footer={(
        <>
          <Button label='Save' disabled={!props.name.trim() || !props.address.trim()} onPress={props.onSave} testID='address-save' />
          {props.onRemove && <Button label='Remove address' tone='tertiary' size='compact' onPress={props.onRemove} />}
        </>
      )}
    >
      <TextField
        label='Name'
        value={props.name}
        onChangeText={props.onChangeName}
        placeholder='Name'
        maxLength={32}
        returnKeyType='next'
        submitBehavior='submit'
        onSubmitEditing={() => addressRef.current?.focus()}
        error={props.nameError}
      />
      <TextField
        ref={addressRef}
        label='Address'
        value={props.address}
        onChangeText={props.onChangeAddress}
        placeholder={props.addressPlaceholder}
        autoCapitalize='none'
        autoCorrect={false}
        spellCheck={false}
        autoComplete='off'
        returnKeyType='done'
        submitBehavior='blurAndSubmit'
        onSubmitEditing={handleSubmitEditing}
        error={props.addressError}
      />
    </Screen>
  );
};
