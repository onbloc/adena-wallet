import React, { ReactElement } from 'react';
import { View } from 'react-native';

import { getInitials } from '../../../utils/address';
import { Text } from '../text';
import { styles } from './avatar.styles';

export const Avatar = ({ name, size = 32 }: { name: string; size?: number }): ReactElement => (
  <View style={[styles.base, { width: size, height: size }]}>
    <Text variant='tab' color='inverse'>{getInitials(name)}</Text>
  </View>
);
