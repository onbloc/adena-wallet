import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { sizes } from '../../../theme';
import { IconButton } from '../../atoms';
import { SearchField } from '../search-field';
import { styles } from './recipient-field.styles';

export interface RecipientFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  onScan: () => void;
  placeholder?: string;
  testID?: string;
}

// Address search field with the QR scan button beside it.
export const RecipientField = ({ value, onChangeText, onScan, placeholder = 'Address', testID }: RecipientFieldProps): ReactElement => (
  <View style={styles.row}>
    <View style={styles.field}>
      <SearchField
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        testID={testID}
        autoComplete='off'
        spellCheck={false}
        returnKeyType='done'
      />
    </View>
    <IconButton icon='scan' variant='surface' size={sizes.control} accessibilityLabel='Scan QR code' onPress={onScan} />
  </View>
);
