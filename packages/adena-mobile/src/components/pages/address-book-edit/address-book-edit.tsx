import React, { ReactElement } from 'react';

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

export const AddressBookEditPage = (props: AddressBookEditPageProps): ReactElement => (
  <Screen
    header={<TopBar title={props.mode === 'add' ? 'Add address' : 'Edit address'} onBack={props.onBack} />}
    footer={(
      <>
        <Button label='Save' disabled={!props.name.trim() || !props.address.trim()} onPress={props.onSave} testID='address-save' />
        {props.onRemove && <Button label='Remove address' tone='tertiary' size='compact' onPress={props.onRemove} />}
      </>
    )}
  >
    <TextField label='Name' value={props.name} onChangeText={props.onChangeName} placeholder='Name' maxLength={32} error={props.nameError} />
    <TextField
      label='Address'
      value={props.address}
      onChangeText={props.onChangeAddress}
      placeholder={props.addressPlaceholder}
      autoCapitalize='none'
      autoCorrect={false}
      error={props.addressError}
    />
  </Screen>
);
