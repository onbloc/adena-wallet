import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { shortenAddress } from '../../../utils/address';
import { IconButton, Text } from '../../atoms';
import { styles } from './address-row.styles';

export interface AddressRowProps {
  address: string;
  onCopy: () => void;
  full?: boolean;
}

// Lists shorten addresses; copying always uses the original string.
export const AddressRow = ({ address, onCopy, full = false }: AddressRowProps): ReactElement => (
  <View style={styles.row}>
    <Text variant='meta' color='secondary' selectable={full} style={full && styles.full}>
      {full ? address : shortenAddress(address)}
    </Text>
    <IconButton icon='copy' accessibilityLabel='Copy address' size={32} onPress={onCopy} />
  </View>
);
