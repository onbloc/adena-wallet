import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { getInitials } from '../../../utils/address';
import { Text } from '../text';
import { styles } from './avatar.styles';

export interface AvatarProps {
  name: string;
  size?: number;
  // Background override (e.g. an account's picked color); defaults to the primary action color.
  color?: string;
}

export const Avatar = ({ name, size = 32, color }: AvatarProps): ReactElement => (
  <View style={[styles.base, { width: size, height: size }, color !== undefined && { backgroundColor: color }]}>
    <Text variant='tab' color='inverse'>{getInitials(name)}</Text>
  </View>
);
