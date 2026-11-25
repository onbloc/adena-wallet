import React, { ReactElement, Ref } from 'react';
import { TextInputInstance, TextInputProps, View } from 'react-native';

import { IconButton } from '../../atoms';
import { SearchField } from '../search-field';
import { styles } from './recipient-field.styles';

export interface RecipientFieldProps extends Pick<TextInputProps, 'returnKeyType' | 'onSubmitEditing' | 'autoFocus'> {
  value: string;
  onChangeText: (value: string) => void;
  onScan: () => void;
  placeholder?: string;
  testID?: string;
  ref?: Ref<TextInputInstance>;
}

// Address search field with the QR scan button beside it.
export const RecipientField = ({ value, onChangeText, onScan, placeholder = 'Address', testID, ref, returnKeyType = 'done', ...inputProps }: RecipientFieldProps): ReactElement => (
  <View style={styles.row}>
    <View style={styles.field}>
      <SearchField
        {...inputProps}
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        testID={testID}
        autoComplete='off'
        spellCheck={false}
        returnKeyType={returnKeyType}
      />
    </View>
    <IconButton icon='scan' variant='surface' accessibilityLabel='Scan QR code' onPress={onScan} />
  </View>
);
