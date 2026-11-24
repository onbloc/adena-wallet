import React, { ReactElement } from 'react';
import { Image, View } from 'react-native';

import { AvatarColor } from '../../../domain/account';
import { avatarColors } from '../../../theme';
import { getInitials } from '../../../utils/address';
import { Text } from '../text';
import { useStyles } from './avatar.styles';

export interface AvatarProps {
  name: string;
  size?: number;
  // An account's picked color; "ink" and unset use the primary action color.
  color?: AvatarColor;
  // Profile photo (data URI); initials on the color are the fallback.
  imageUri?: string;
}

export const Avatar = ({ name, size = 32, color, imageUri }: AvatarProps): ReactElement => {
  const styles = useStyles();
  const background = color === undefined || color === AvatarColor.INK ? undefined : avatarColors[color];

  return (
    <View style={[styles.base, { width: size, height: size }, background !== undefined && { backgroundColor: background }]}>
      {imageUri
        ? <Image source={{ uri: imageUri }} style={styles.image} resizeMode='cover' accessibilityIgnoresInvertColors testID='avatar-photo' />
        : <Text variant='tab' color='inverse' style={background !== undefined && styles.onColor}>{getInitials(name)}</Text>}
    </View>
  );
};
